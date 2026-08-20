# 抓材料——并行委派给子代理，不要顺序抓

这是 `engineering-report` 技能第三步引用的文件，抓材料之前必须读完这份文件的全文。

## 为什么要并行

GitHub、GitLab、Jira 这三个数据源之间没有依赖关系，谁先抓谁后抓不影响结果。如果按顺序在当前
对话里一个一个抓，每个数据源自己的分页、报错重试、格式摸索都会累加进当前对话的轮次/输出预算，
长周期、多数据源的情况下很容易在读完材料前就把预算耗光，导致后面整理、产出 HTML 的步骤没有预算
可用（甚至被单轮输出上限直接截断）。

**用 `task` 工具把三个数据源分别委派给子代理，在同一条消息里发起三个 `task` 调用（而不是发一个
等结果、再发下一个）**，这样三个子代理并发执行；子代理内部消耗多少轮次都不计入当前对话自己的
预算，当前对话只为"发起这三次委派"这一步付出成本。

## 子代理拿不到当前对话的上下文，委派描述必须自包含

`task` 子代理是全新起点，看不到这次对话之前发生的任何事——不知道用户问了什么、不知道第一步算
出的时间区间、不知道第二步从工作区指引读到的组织/project/GitLab 地址，**也不会自动发现有哪些
skill 可用**。所以每个 `task` 调用的 `description` 必须把下面模板里的占位符替换成实际值后，
原样整段作为委派描述传进去，不能只写"帮我抓 GitHub 数据"这种缺上下文的话。

三个 `task` 调用的 `subagent_type` 都填 `general-purpose`。

### GitHub 子代理

```
抓取 GitHub 组织 <org>（第二步核实过的实际 org login）在 <起始时间戳> 到 <结束时间戳>
（ISO 8601 UTC）之间的所有 PR 和 issue 更新。

用 run_skill_script 工具调用 github-cli 技能的 gh 脚本执行以下命令。

不要用 `gh api search/issues`（含 `/search/issues`）——这条通用 API 通道在当前环境的 gh 版本
上无论参数对不对都返回 404，是已知坑。改用专用子命令：
  gh search issues --owner <org> --include-prs --updated "<起始时间戳>..<结束时间戳>" \
    --json repository,number,title,author,state,updatedAt,url -L 100
-L 默认只返回 30 条，数量多时调大或分页直到覆盖完整区间。

对每个 PR/issue，用 gh pr view <n> --repo <repo> --json title,body,comments 或
gh issue view <n> --repo <repo> --json title,body,comments 拿描述和评论正文，不要只看标题和
状态。commit message 首行用于判断改动描述是否清楚，写得敷衍（如 "fix bug"、"update"）记下来即可
不用深挖。

任务完成后，只返回一份精简摘要，不要把原始 API 输出整段贴回来：按 GitHub 账号（不是真实姓名，
你不知道姓名映射表）分组，每条事项一两句话讲清楚做了什么/解决了什么问题，标明状态
（merged/open/closed）、编号、时间。
```

### GitLab 子代理

```
抓取 GitLab 实例 <GITLAB_HOST>（协议：<http:// 或 https://，来自第二步工作区指引）在
<起始时间戳> 到 <结束时间戳>（ISO 8601 UTC）之间的所有 MR 更新（<范围说明：不限
group/project，或工作区指引里配置的具体范围>）。

用 run_skill_script 工具调用 gitlab-cli 技能的 glab 脚本执行以下命令。

如果实例是纯 http://：glab api 传相对路径时固定按 https:// 解析，会报 "HTTP response to
HTTPS client"，这种情况下每次调用都必须传完整绝对 URL，例如：
  glab api http://<GITLAB_HOST>/api/v4/merge_requests?updated_after=<起始时间戳>&updated_before=<结束时间戳>
不能写成 glab api merge_requests?...。如果实例是 https://，用相对路径正常即可，不需要这个
workaround。

对每个 MR，拿描述（description）和评论，不要只看标题和状态；commit message 首行同样用于判断
描述质量。

任务完成后，只返回一份精简摘要：按 GitLab 账号分组，每条事项一两句话讲清楚做了什么，标明状态
（merged/open/closed）、MR 编号、时间。
```

### Jira 子代理

```
抓取 Jira project <PROJECT_KEY>（来自第二步工作区指引；没配置具体 project 则先用
jira project list 拿全部 project 分别查询）在 <起始日期时间> 到 <结束日期时间>（本地时间，不
带时区）之间的所有 issue 更新。

用 run_skill_script 工具调用 jira-cli 技能的 jira 脚本执行以下命令。

--updated/--created 不支持区间语法（开始..结束 会报 400），用 -q/--jql 写标准 JQL，日期比较
写成 updated >= "yyyy-MM-dd HH:mm"（空格分隔，不带时区）。用 -q 时不要同时传 -p——两者一起传，
-p 会把范围锁死，JQL 里的条件反而不生效。例如：
  jira issue list -q "project = <PROJECT_KEY> AND updated >= \"<起始>\" AND updated <= \"<结束>\"" \
    --plain --no-headers --columns KEY,SUMMARY,STATUS,ASSIGNEE,UPDATED
若返回 "No result found for given query in project ..." 且退出码非 0，这是"这段时间该 project
没有更新"的正常结果，不是失败，不要重试、不要当错误上报。

对每个 issue，用 jira issue view <KEY> --comments 5 --plain 拿描述和评论，尤其是窗口内新增的
评论——通常就是这个人实际在做的事情的第一手说明。

任务完成后，只返回一份精简摘要：按指派人（assignee，账号形式）分组，每条事项一两句话讲清楚做了
什么，标明状态（Done/In Review/处理中/待办）、issue key、时间。
```

## 三个子代理都返回之后

把三份精简摘要放在一起，进入第五步按人整理——这一步才需要工作区指引里的账号映射表（把
GitHub/GitLab 账号、Jira 指派人翻译/合并成真实姓名），子代理自己不知道映射表，只按账号/指派人
分组返回是预期行为，不是它们的疏漏。

如果某个子代理返回的材料明显不完整（比如提示达到了它自己的轮次/输出上限），如实在最终报告的
风险/数据覆盖说明里写清楚哪个数据源、哪段时间没抓全，不要假装抓全了。
