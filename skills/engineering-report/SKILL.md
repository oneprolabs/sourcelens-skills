---
name: engineering-report
description: Produces a per-person engineering work report — for each person: what they completed, what's in progress, risks, and an overall comment — for a given period (daily standup, weekly, monthly, quarterly, yearly), by reading commits, PR/MR descriptions, comments, and Jira updates across GitHub, GitLab, and Jira. Observation scope (GitHub org, Jira project, GitLab range, name mapping) comes from the bound workspace guide, not hardcoded here — works for any organization without modification. Person-level only, not a team/project rollup (that's a different skill). Use this proactively whenever the user asks for a "daily report", "日报", "周报", "月报", "季报", "年报", "研发报告", "晨会汇总", "团队每个人的工作情况", "谁昨天做了什么", "上周大家的进展", or any request to see what specific people on an engineering team did/are doing/are stuck on — even casual phrasing like "帮我看看这周XX干了啥" or "整理一下团队最近的进度" without the word "report" in it.
---

# Engineering Activity Report（人物维度）

**定位**：这个技能只做一件事——给定一个统计周期，逐人列出"完成的 / 正在做的 / 风险 / 评语"。
只按人物维度输出，不做团队汇总、不做项目整体进展分析（那是另一个技能的事）。GitHub/GitLab/Jira
只是取材料的地方，每条事项要标注来源，但不要按来源分表/分列，主体永远是"人"。

## 依赖的工具技能

`github-cli`（`gh`）、`gitlab-cli`（`glab`）、`jira-cli`——均通过 `run_skill_artifact`/
`run_skill_script` 调用，使用运行时环境里配置好的凭证，不要向用户询问 token。

## 第一步：统计周期与时间戳

先取当前时间，换算成 Asia/Shanghai（UTC+8），按用户措辞判断周期类型：

| 用户说 | 周期类型 | 默认取值 |
|---|---|---|
| "日报"/"晨会"/未提周期 | day | 上一个工作日（周一→上周五，周六/周日→上周五） |
| "周报"/"上周" | week | 上一个完整 ISO 周（周一～周日） |
| "月报"/"上个月" | month | 上一个完整自然月 |
| "季报"/"上季度" | quarter | 上一个完整自然季度 |
| "年报"/"去年" | year | 上一个完整自然年 |

说"这周"/"这个月"等当前进行中周期时，统计从周期开始到现在；用户给了具体日期/区间时，直接按
用户说的来，不套用上表。

区间必须是完整周期，从当地时间 **00:00:00 到 23:59:59（UTC+8）**，转成 UTC 传给各工具时用
带完整时间的 ISO 8601 时间戳，不要只传日期（裸日期在多数工具里是整天含边界，会多算一天）。
回答开头用一句话写清楚周期类型和具体起止时间。

## 第二步：先读工作区指引，拿到本次的观测范围

**本技能不内置任何具体公司的组织名、project key、人名映射**——同一套技能要能在不同公司的
SourceLens 部署上直接用，公司专属的东西必须来自外部配置，不能写死在这里。每次运行开始前，先
读取当前绑定的工作区指引（workspace guide），从里面获取本次观测范围参数：
- GitHub 观测范围（组织 login，或"不限组织"）
- Jira 观测范围（project key，或"不限 project"）
- GitLab 观测范围（是否限定 group/project；实例地址是 `http://` 还是 `https://`）
- 账号到真实姓名的映射表（如果有）、产品/项目归属规则（如果有）

工作区指引没有覆盖到的细节，按"不限制、token 能看到什么就用什么"处理，不要自己假设一个范围。
下面各小节里的 `<org>`、`<PROJECT_KEY>`、`<GITLAB_HOST>` 都是占位符，实际值从工作区指引里取，
**不要把任何一次运行里读到的具体组织名/project key 当成以后也适用的固定值写死在推理过程里**——
下次换一家公司用这个技能，这些值会完全不同。

**"读取"必须是真的打开文件，不是列目录。** 用文件读取工具打开工作区指引技能目录下的
`SKILL.md`（例如 `skills/<workspace-guide-slug>/SKILL.md`）并读出正文——只做一次
`ls`/目录清单、看到文件存在就当作"已读取"是不够的，那样账号映射表等内容根本没进入上下文。
这必须是本技能执行的第一个动作，先于核实组织/project、抓取任何数据源之前完成。长对话中途如果
因为处理 GitHub/GitLab/Jira 的分页、报错重试等分心，进入第四步整理前要自问一遍"工作区指引的
正文我是不是真的读过"——没有把握就重新读一次，不要凭印象或猜测继续，尤其是账号映射表，宁可
重读一次，也不要在没读到的情况下写"当前无账号映射表"。

## 第三步：抓材料之前，先读 OUTPUT_FORMAT.md

**这一步必须排在抓材料之前，不要等写最终答案时才想起来。** 用 `read_file` 打开本技能目录下的
`OUTPUT_FORMAT.md`，读出完整正文。这个文件里是：

- 按人整理材料时的合并规则（尤其是账号跟映射表对不上但明显是同一人的情况要怎么处理、怎么标注）；
- 最终交付物的格式要求——**产出方式已经从"聊天里发 Markdown 正文"改成"生成 HTML 看板文件并用
  `save_deliverable` 交付"**，不是老印象里的 Markdown 段落。

提前读是因为：如果等抓完材料再读，很容易凭 Markdown 报告的固有印象直接动笔；提前知道最终要产出
什么格式、账号要怎么合并，抓材料和整理阶段才能对着目标来，不用最后返工。这一步跳过、只做过
`ls`/目录清单、或者凭"技能应该是这样"的印象往下走，都不算完成。

## 第四步：抓材料——拿内容，不是拿编号

标题、编号、状态只是索引，不是内容。管理者要看的是具体做了什么、解决了什么问题——这些信息在
**commit message、PR/MR 描述、评论、Jira 描述与评论**里，必须读出来，不能只列标题和状态。

### GitHub（严格限定第二步拿到的组织范围，组织外仓库不看）

- 核实组织 login：`gh api /orgs/<org>`（工作区指引给的可能是显示名，不一定是实际 login，需要
  核实一遍，不要假设两者相同）。
- **不要用 `gh api search/issues`**（含 `/search/issues`）——这条通用 API 通道在当前环境的
  `gh` 版本上无论参数对不对都返回 404，是这个 CLI 版本的已知坑，跟具体公司无关。改用专用子
  命令：
  ```text
  gh search issues --owner <org> --include-prs \
    --updated "<开始时间戳>..<结束时间戳>" \
    --json repository,number,title,author,state,updatedAt,url -L 100
  ```
  `-L` 默认只返回 30 条，长周期要调大或分页。
- 对每个 PR/issue，用 `gh pr view <n> --repo <repo> --json title,body,comments` /
  `gh issue view <n> --repo <repo> --json title,body,comments` 拿描述和评论正文。
- commit message 首行用于判断改动描述是否清楚；写得敷衍（如 "fix bug"、"update"）在评语里
  标注"描述不详"即可，不需要读 diff 反推改了什么。

### GitLab（观测范围按工作区指引；先确认实例是 http 还是 https）

- 先看工作区指引/`GITLAB_HOST` 判断实例协议。**如果是纯 `http://`**：`glab api` 传相对路径
  时固定按 `https://` 解析，会报 "HTTP response to HTTPS client"，这种情况下**每次调用都
  必须传完整绝对 URL**，例如
  `glab api http://<GITLAB_HOST>/api/v4/merge_requests?updated_after=...&updated_before=...`，
  不能写成 `glab api merge_requests?...`。这个坑很容易在长对话里被忘记，每次调用前自查一遍。
  如果实例本身是 `https://`，用相对路径正常即可，不需要这个 workaround。
- 对每个 MR，拿描述（description）和评论；commit message 首行同样用于判断描述质量。

### Jira（观测范围按工作区指引里配置的 project key）

- 只看工作区指引里配置的 project（没配置则不限制，`jira project list` 拿全部 project 分别
  查询）。
- **`--updated`/`--created` 不支持区间语法**（`开始..结束` 会报 400）——这是这个 jira CLI 的
  已知坑，跟具体公司无关。用 `-q`/`--jql` 写标准 JQL，日期比较写成
  `updated >= "yyyy-MM-dd HH:mm"`（空格分隔，不带时区）。**用 `-q` 时不要同时传 `-p`**——
  两者一起传，`-p` 会把范围锁死，JQL 里的条件反而不生效。例如（`<PROJECT_KEY>` 替换成工作区
  指引里配置的值）：
  ```text
  jira issue list -q "project = <PROJECT_KEY> AND updated >= \"2026-08-17 00:00\" AND updated <= \"2026-08-17 23:59\"" \
    --plain --no-headers --columns KEY,SUMMARY,STATUS,ASSIGNEE,UPDATED
  ```
- 若返回 "No result found for given query in project ..." 且退出码非 0，这是"这段时间该
  project 没有更新"的正常结果，不是失败，不要重试、不要当错误上报。
- 对每个 issue，用 `jira issue view <KEY> --comments 5 --plain` 拿描述和评论，尤其是窗口内
  新增的评论——通常就是这个人实际在做的事情的第一手说明。

## 第五步：按人整理——区分角色，标注来源，分清完成没完成

（账号与映射表的合并/标注规则见第三步读过的 `OUTPUT_FORMAT.md`，这里不重复。）

- 以人为主键合并三个来源的材料。平台 API 自带真实姓名字段的（如 GitLab 作者 display name）
  直接用；工作区指引里的映射表能精确匹配到的账号，翻译成真实姓名展示。
- **每一条事项标注来源**：`(GitHub)` / `(GitLab)` / `(Jira)`，事项句尾可带编号作为附带引用
  （如 "（PROJ-6790）"、"（PR #354）"）。
- **区分角色，不要把"谁关闭/标记状态"当成"谁做的事"**：发现/报告人（issue reporter）、
  实现人（PR/MR/commit 作者）、验证/收尾人（Jira 里做验收、标完成但代码不是他写的）是三种
  不同角色，同一件事里可能是不同的人。典型场景：Jira 任务指派给 A、A 标记完成，但对应的
  MR 是 B 提交合并的——记为"A：验证/收尾"，"B：实现"，不要合并说成"A 完成了这个任务"。
- **区分"完成"和"进行中"**：真正合并/关闭/Done 的算完成；仍在 review、进行中、或只有讨论没
  落地结果的算进行中，两者不能混在一起。

## 第六步：整理内容与产出

按 `OUTPUT_FORMAT.md`（第三步已读过）的格式要求整理成最终答案：人物维度四段结构、写成 HTML
看板文件、用 `save_deliverable` 交付。不要凭印象改回 Markdown 正文。

## 注意事项

- 严格按工作区指引配置的范围来（GitHub 组织、Jira project 等），不要扩大范围，也不要把某次
  运行读到的具体值当成固定值硬编码进后续推理。
- 内容量通常较大：先分来源批量抓取、各自消化提炼要点，再进入第五步合并，不要把大段原始 API
  输出、原始评论全文堆进最终回答。
- 只做人物维度报告，不要额外输出团队汇总/项目整体进展这类内容。
- 第三步的 `OUTPUT_FORMAT.md` 必须在抓材料前实际读取，不能跳过——它决定合并规则和最终交付物
  的格式。

