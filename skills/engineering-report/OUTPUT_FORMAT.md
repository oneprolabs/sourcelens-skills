# 整理内容与最终产出格式

这是 `engineering-report` 技能第五步引用的文件，抓完材料、准备写最终答案前必须读完这份文件的
全文，不能只读 `SKILL.md` 就凭印象产出。

## 一、整理内容——固定四段结构，人物维度

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
   - **账号与工作区指引映射表不完全一致、身份为推断而非确认**（见下方"账号近似匹配"）——
     这一条不是可选项，符合条件就必须写进风险列表，不能只在心里判断合并与否却不落笔标注。
5. **评语**：一段话综合评价，覆盖两件事——
   - **质量**：是否讲清楚了根因（不是表面打补丁）、有没有返工/反复修改的迹象、有没有验证证据；
     三点都没问题才用"扎实"这类正面评价，只要有一点明显缺失就要点出具体缺口。
   - **饱满度**：跟这份报告里其他人的产出做相对比较；同时有一个启发性下限——本期零完成，或者
     全是琐碎小改动（如单纯文案/翻译、一行改动且无实质说明），直接写"产出明显偏低"，不要因为
     "有几条记录"就笼统归为正常，不要为了照顾情面模糊带过。

不要按来源分列（不要出现"GitHub 动态 / GitLab 动态 / Jira 动态"这样的分组），来源信息放在每
条事项里，不是内容的组织结构。某人本期确实没有任何可核实活动，如实说明，不要编造。

### 账号近似匹配——合并展示，但必须标注，不能悄悄处理

某个 GitHub/GitLab 账号在工作区指引的映射表里找不到完全一致的条目，但账号名与表里某一条高度
相似（同一姓名拼音/词根前缀，只有数字后缀、大小写或连字符不同）时：

1. 把这部分事项合并进最相似的那个人名段落展示——不当陌生人处理。
2. **在该人的"风险"部分明确写一句"账号 `<实际账号>` 与映射表 `<表里账号>` 不完全一致，建议
   核实"**——这句话是强制项，只做到第 1 步的合并、不写这句提示，等于替读者悄悄下了结论，是
   不允许的。检查自己写完的每个人的段落：只要这个人的材料里有任何一条是靠近似匹配合并进来
   的，"风险"部分就必须出现这句话，没有例外。

映射表里完全找不到任何相似条目的账号，才按原始账号名展示，不自己猜姓名映射。

## 二、产出——静态 HTML 看板文件，不要输出 Markdown 正文

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

**HTML 模板骨架**（把 `<!-- ... -->` 部分替换成上面整理出的真实内容，每人一个 `<article>`，
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

不要把大段原始 API 输出、原始评论全文堆进 HTML 文件。最终交付是 HTML 文件
（`save_deliverable`），聊天正文只做简短说明，不要重复输出 Markdown 版的完整报告。
