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

## 第三步：抓材料——拿内容，不是拿编号

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

## 第四步：按人整理——区分角色，标注来源，分清完成没完成

- 以人为主键合并三个来源的材料。平台 API 自带真实姓名字段的（如 GitLab 作者 display name）
  直接用；工作区指引里的映射表能精确匹配到的账号，翻译成真实姓名展示。
- **账号跟映射表对不上、但明显像是同一个人时，不要直接拆成陌生人，也不要自己下结论合并**：
  如果某个 GitHub/GitLab 账号在映射表里找不到完全一致的条目，但账号名与表里某一条高度相似
  （同一姓名拼音/词根前缀，只有数字后缀、大小写或连字符不同），把这部分事项合并进最相似的那
  个人名段落展示，同时用醒目方式标注"账号与映射表不完全一致，建议核实"，交给报告的读者去确
  认，而不是替他们悄悄拆开或悄悄合并。映射表里完全找不到任何相似条目的账号，才按原始账号名
  展示，不自己猜姓名映射。
- **每一条事项标注来源**：`(GitHub)` / `(GitLab)` / `(Jira)`，事项句尾可带编号作为附带引用
  （如 "（PROJ-6790）"、"（PR #354）"）。
- **区分角色，不要把"谁关闭/标记状态"当成"谁做的事"**：发现/报告人（issue reporter）、
  实现人（PR/MR/commit 作者）、验证/收尾人（Jira 里做验收、标完成但代码不是他写的）是三种
  不同角色，同一件事里可能是不同的人。典型场景：Jira 任务指派给 A、A 标记完成，但对应的
  MR 是 B 提交合并的——记为"A：验证/收尾"，"B：实现"，不要合并说成"A 完成了这个任务"。
- **区分"完成"和"进行中"**：真正合并/关闭/Done 的算完成；仍在 review、进行中、或只有讨论没
  落地结果的算进行中，两者不能混在一起。

## 第五步：整理内容——固定四段结构，人物维度

**按人分段**整理，每人固定四个部分，缺失的部分写"无"，不要省略标题：

1. **姓名/账号**（小标题）
2. **完成的**：编号列表，每条一句话讲清楚做了什么/解决了什么问题，标来源和角色，如
   "完成 XX 兼容性修复 (GitHub · 实现)（PR #612）"。不要写"3 个 PR 已合并"这种产物计数。
3. **正在做的**：同样编号列出，跟"完成的"分开。若这个人本期**完全没有已完成事项**，仍然要
   列出这个标题并写清楚正在做什么，不要跳过。
4. **风险**：本期这个人身上出现的、值得管理者关注的信号，直接点出来，没有就写"无明显风险"：
   - 本期零完成（只有进行中，没有任何完成项）
   - 同一问题反复提交/多个 PR 才改对，或有 revert/回退
   - 只有状态变更、看不到测试/验证证据
   - 事项长期停留在 review/进行中没有推进
   - commit/PR 描述普遍敷衍（"fix bug"、"update" 之类）
   - 账号与工作区指引映射表不完全一致、身份为推断而非确认（见第四步）
5. **评语**：一段话综合评价，覆盖两件事——
   - **质量**：是否讲清楚了根因（不是表面打补丁）、有没有返工/反复修改的迹象、有没有验证证据；
     三点都没问题才用"扎实"这类正面评价，只要有一点明显缺失就要点出具体缺口。
   - **饱满度**：跟这份报告里其他人的产出做相对比较；同时有一个启发性下限——本期零完成，或者
     全是琐碎小改动（如单纯文案/翻译、一行改动且无实质说明），直接写"产出明显偏低"，不要因为
     "有几条记录"就笼统归为正常，不要为了照顾情面模糊带过。

不要按来源分列（不要出现"GitHub 动态 / GitLab 动态 / Jira 动态"这样的分组），来源信息放在每
条事项里，不是内容的组织结构。某人本期确实没有任何可核实活动，如实说明，不要编造。

## 第六步：产出——静态 HTML 看板文件，不要输出 Markdown 正文

**最终交付物是一个自包含的 HTML 文件，不是聊天回答里的 Markdown 文本。** 原因：聊天消息经过
Markdown 渲染器和安全过滤（DOMPurify 白名单），`<style>`、`<script>`、内联 `style=` 属性统统
会被剥掉，长报告写成 Markdown 正文既没有样式也无法按人筛选，来回翻页体验差；HTML 文件作为
deliverable 交付则没有这个限制，且能在会话里预览、下载。

**产出方式**：

1. 用 `write_file`（内容较短时）或 `append_file`（内容较长时，每块 ≤ 24 KiB，`chunk_id` 用
   `report-001`、`report-002` 这样的递增编号）把下面的 HTML 模板写成一个文件，例如
   `<统计区间>-engineering-report.html`。
2. 写完后调用 `save_deliverable(path)` 交付这个文件。**不要**在聊天回答正文里把这段 HTML 源码
   贴出来或用代码块包裹展示——那样既没有渲染效果，又占用输出预算。
3. 聊天回答正文保持简短：一两句话说明统计区间、数据覆盖情况（第一步产出的说明、抓取过程中遇到
   的截断/预算限制），以及"详细报告见下方文件"，不要在正文里重复每人的完整内容。

**筛选交互只能用 CSS，不能用 JS**：deliverable 在会话内预览走的是沙箱 iframe
（`sandbox=""`，未开 `allow-scripts`），`<script>` 不会执行；只有用户下载后用浏览器直接打开
才会跑脚本，不能依赖这条路径。用"隐藏 radio + label 当筛选按钮 + CSS 选择器控制显示/隐藏"这
个纯 CSS 方案，会话内预览和下载后打开都能正常筛选。

**HTML 模板骨架**（把 `<!-- ... -->` 部分替换成第五步整理出的真实内容，每人一个 `<article>`，
CSS 结构照抄，只需要为每个人追加一组 radio + label + 对应的 `:checked` 隐藏规则）：

```html
<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title><!-- 统计周期，如"2026-08-19 昨日工作日报" --></title>
<style>
  :root {
    --bg:#F4F6F8; --surface:#FFFFFF; --ink:#16202B; --ink-soft:#4B5766;
    --ink-faint:#7C8896; --border:#DCE1E7; --accent:#2E6E86;
    --accent-soft:#E4EEF1; --success:#2E7D4F; --success-soft:#E4F2E9;
    --warn:#B4711E; --warn-soft:#FBEEDD; --flag:#B0472F; --flag-soft:#FBEAE5;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg:#121821; --surface:#1A222C; --ink:#E7ECF1; --ink-soft:#ABB6C2;
      --ink-faint:#78838F; --border:#2C3742; --accent:#74BBD0;
      --accent-soft:#1E323A; --success:#74CB98; --success-soft:#1C3226;
      --warn:#E4A75C; --warn-soft:#392C19; --flag:#E68C77; --flag-soft:#392019;
    }
  }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--ink);
    font-family:-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",
      "Noto Sans SC",sans-serif; line-height:1.55; }
  .app { max-width:1320px; margin:0 auto; padding:24px 20px 48px; }
  .filters input[type="radio"] { position:absolute; opacity:0; pointer-events:none; }
  .filters label { display:inline-block; padding:6px 12px; margin:0 6px 6px 0;
    border:1px solid var(--border); border-radius:999px; font-size:13px;
    cursor:pointer; color:var(--ink-soft); }
  .board { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr));
    gap:16px; }
  .card { background:var(--surface); border:1px solid var(--border);
    border-left:4px solid var(--ink-faint); border-radius:10px; padding:16px 18px; }
  .card.status-ok { border-left-color:var(--success); }
  .card.status-idle { border-left-color:var(--warn); }
  .sec-label { font-size:11px; text-transform:uppercase; letter-spacing:.06em;
    color:var(--ink-faint); font-weight:700; margin:10px 0 4px; }
  .sec ul { margin:0; padding-left:16px; } .sec li { font-size:13px; color:var(--ink-soft); }
  .risk p { color:var(--warn); font-size:13px; }
  .flag { display:inline-block; font-size:11px; padding:3px 8px; border-radius:6px;
    background:var(--flag-soft); color:var(--flag); border:1px dashed var(--flag); }
  /* 每人一组：radio 选中时，隐藏所有 data-name 不等于该人的卡片 */
  #f-all:checked ~ .board .card { display:block; }
  #f-<person-slug-1>:checked ~ .board .card:not([data-name="<person-slug-1>"]) { display:none; }
  #f-<person-slug-2>:checked ~ .board .card:not([data-name="<person-slug-2>"]) { display:none; }
  <!-- 每新增一人，追加一条上面这样的规则，person-slug 用不含空格的账号/姓名拼音 -->
</style>
</head>
<body>
<div class="app">
  <h1><!-- 统计周期标题 --></h1>
  <p><!-- 统计区间、数据覆盖说明，来自第一步/抓取过程 --></p>

  <input type="radio" name="filter" id="f-all" checked>
  <!-- 每人一个 radio，id 用 f-<person-slug> -->
  <nav class="filters">
    <label for="f-all">全部</label>
    <!-- 每人一个 label，for 对应上面的 radio id -->
  </nav>

  <main class="board">
    <!-- 每人一个 article，data-name 与对应 radio 的 person-slug 一致 -->
    <article class="card status-ok" data-name="<person-slug>">
      <h3><!-- 姓名/账号 --></h3>
      <!-- 如账号与映射表不完全一致： <span class="flag">账号与映射表不完全一致，建议核实</span> -->
      <div class="sec"><div class="sec-label">完成的</div><ul><!-- li 列表，或"无" --></ul></div>
      <div class="sec"><div class="sec-label">正在做的</div><ul><!-- li 列表，或"无" --></ul></div>
      <div class="sec risk"><div class="sec-label">风险</div><p><!-- 风险文本 --></p></div>
      <div class="sec"><div class="sec-label">评语</div><p><!-- 评语文本 --></p></div>
    </article>
  </main>
</div>
</body>
</html>
```

`status-ok`/`status-idle` 按"本期是否有完成项"选择（有完成项用 `status-ok`，零完成用
`status-idle`），不要额外发明新的状态维度。人数很多时卡片会很长，可以用原生 `<details>` 折叠
长列表（比如某人当日合并几十个 PR，按主题分组后用 `<details><summary>` 收起），不需要 JS。

## 注意事项

- 严格按工作区指引配置的范围来（GitHub 组织、Jira project 等），不要扩大范围，也不要把某次
  运行读到的具体值当成固定值硬编码进后续推理。
- 内容量通常较大：先分来源批量抓取、各自消化提炼要点，再进入第四步合并，不要把大段原始 API
  输出、原始评论全文堆进最终回答，也不要堆进 HTML 文件。
- 只做人物维度报告，不要额外输出团队汇总/项目整体进展这类内容。
- 最终交付是 HTML 文件（`save_deliverable`），聊天正文只做简短说明，不要重复输出 Markdown 版
  的完整报告。

