# KILLCode 个人算法学习工具设计文档

> 文档版本：V2.1（本地 Codex 订阅版）  
> 使用范围：仅供个人学习，不提供注册、登录或多人使用  
> 内容来源：`youngyangyang04/leetcode-master`  
> 视觉方向：Linear 风格的克制、清晰、高密度产品界面

## 1. 产品定位

KILLCode 是一个本地运行的个人算法学习网页。它将 `leetcode-master` 中的 Markdown 题解转换为结构化学习页面，并围绕每一道题提供：

- Markdown 阅读
- 学习进度
- 私人笔记
- 伪代码练习
- 一键 AI 思路评估
- 与当前题目绑定的 AI 对话记录

产品只解决一个问题：帮助使用者按路线阅读、思考、写出伪代码、获得反馈，并保留整个学习过程。

## 2. 精简原则

### 2.1 保留功能

- Markdown 内容导入与渲染
- 官方推荐学习顺序
- 题号、标题与正文搜索
- 未开始、学习中、已完成三种状态
- 每题收藏，以及首页“只看收藏”筛选
- 每题私人笔记
- 每题伪代码草稿
- 一键 AI 评估思路
- 每题一个持续 AI 会话
- 自动保存到当前浏览器
- JSON 数据备份与恢复
- Linear 风格桌面界面及基础移动端适配
- 深色、浅色主题

### 2.2 明确删除

- 注册、登录、退出和账户恢复
- 用户表、权限角色和用户管理
- PostgreSQL、Supabase、Drizzle 和行级安全策略
- 云同步和跨设备恢复
- 游客数据迁移
- 本地与云端冲突合并
- 排行榜、社区、评论和多人协作
- 掌握度评分和复习日程
- 独立 AI 历史页面
- 私人笔记与聊天全文搜索
- 分布式限流和运营后台
- 自动生成上游同步 PR
- 代码编译、执行和在线判题
- 算法动画与步骤可视化

### 2.3 关键取舍

所有个人数据仅保存在浏览器 IndexedDB。这样可以完全移除账户和数据库系统，但存在两个限制：

1. 清除浏览器数据会删除学习记录。
2. 不会自动同步到其他电脑或浏览器。

因此必须提供显眼、简单的 JSON 导出和导入功能。

## 3. 安全运行边界

应用不保存 OpenAI API Key。AI 能力由本机已登录的 Codex CLI 订阅会话提供，因此默认只能作为本地应用运行：

- 开发及使用地址绑定到 `127.0.0.1`。
- Next.js 服务端以子进程启动 `codex app-server --listen stdio://`，通过 JSONL JSON-RPC 通信。
- 浏览器只调用 KILLCode 的同源 API，不直接连接 App Server，也不读取 Codex 登录文件、OAuth 凭据或访问令牌。
- App Server 使用 `codex login` 已建立的 ChatGPT/Codex 登录状态；这只是本机运行前置条件，不在网页内增加账户或登录功能。
- AI 线程使用只读沙箱、禁用网络、`approvalPolicy: 'never'`，不允许写文件、执行用户伪代码或调用无关工具。
- 不得将无访问保护的 AI 接口部署到公网。
- 如未来需要公网访问，必须另行增加外部访问控制；这不属于当前版本。

用户的提问、伪代码和必要题目内容会通过本机 App Server 发送到当前 Codex 订阅所使用的模型，需要在首次使用 AI 时明确提示。订阅额度与模型可用性由 Codex 管理。

## 4. 内容授权边界

上游仓库目前没有标准 LICENSE 文件，README 表示引用需要注明出处与链接，并禁止恶意搬运与洗稿。

- 当前版本定位为个人本地学习工具。
- 每篇题目显示原作者、原仓库与原文链接。
- 不删除或替换原作者署名。
- 不把上游内容标记为 KILLCode 原创。
- 未取得作者明确授权前，不公开部署完整内容镜像。

## 5. 核心学习流程

### 5.1 开始学习

1. 打开首页。
2. 在学习路线中选择一道题，或点击“继续学习”。
3. 进入题目页后，系统自动将状态从“未开始”更新为“学习中”。

### 5.2 阅读与思考

1. 阅读题面和讲解。
2. 可开启“先思考”，折叠题解部分。
3. 在私人笔记中记录思路、错误与疑问。
4. 笔记停止输入约 800ms 后自动保存。

### 5.3 伪代码练习

1. 切换到“代码练习”。
2. 使用中文步骤、英文关键字或混合形式编写伪代码。
3. 草稿按当前题目自动保存。
4. 点击“一键 AI 评估思路”。
5. 查看缺陷、反例、边界条件、复杂度和下一步建议。
6. 可以针对评估结果继续向本题 AI 提问。

### 5.4 完成与回访

1. 将题目标记为“已完成”。
2. 回到首页时进度立即更新。
3. 再次进入该题时恢复阅读位置、笔记、伪代码和 AI 对话。

## 6. 页面与路由

只保留两个主要页面和一个设置抽屉：

| 路由 | 页面 | 功能 |
| --- | --- | --- |
| `/` | 学习路线 | 搜索、专题列表、总体进度、继续学习、最近学习 |
| `/problems/[slug]` | 题目工作区 | 阅读、笔记、伪代码、AI 评估和本题对话 |
| 设置抽屉 | 本地设置 | 主题、AI 偏好、导出、导入和清空数据 |

不创建独立的收藏页面；收藏直接作为首页学习路线的筛选条件。不创建复习、历史、账户和管理页面。

## 7. 首页设计

首页采用列表和分组，不使用大量仪表盘卡片。

```text
┌──────────────────────────────────────────────────────────────┐
│ KILLCode              搜索题目 ⌘K   ☆ 只看收藏    设置       │
├──────────────────────────────────────────────────────────────┤
│ 继续学习                                                     │
│ 704. 二分查找                                      继续 →   │
├──────────────────────────────────────────────────────────────┤
│ 总进度  18 / 200                                             │
│ ███████░░░░░░░░░░░░                                         │
├──────────────────────────────────────────────────────────────┤
│ 数组  6/9                                                    │
│  ● 理论基础                                                  │
│  ◐ 704. 二分查找                                             │
│  ○ 27. 移除元素                                              │
│                                                              │
│ 链表  0/9                                                    │
│  ○ 链表理论基础                                              │
└──────────────────────────────────────────────────────────────┘
```

功能要求：

- 专题默认折叠，只展开当前学习专题。
- 题目状态使用图形和文字共同表达。
- `⌘/Ctrl + K` 打开搜索面板。
- 搜索支持题号、标题、专题和正文关键词。
- “只看收藏”开启后，路线保持原有专题结构，只隐藏未收藏题目。
- 收藏为空时展示简短空状态，并提供“查看全部题目”。
- “继续学习”指向最近打开且未完成的题目。
- 总进度只计算路线中的正式题目，不重复计算理论或总结页面。

## 8. 题目工作区设计

### 8.1 桌面布局

```text
┌─────────────────────────────────────────────────────────────────────┐
│ KILLCode   搜索 ⌘K   题目标题           保存状态       深浅主题    │
├───────────────┬───────────────────────────────┬─────────────────────┤
│ 学习路线       │ 阅读｜代码练习｜笔记           │ 本题 AI             │
│               │                               │                     │
│ 数组          │ 状态 / ☆ 收藏 / 原题 / 先思考  │ 当前题目             │
│  ● 理论基础   │                               │ 消息记录             │
│  ◐ 二分查找   │ Markdown / 编辑器 / 笔记       │                     │
│  ○ 移除元素   │                               │ 快捷提问             │
│               │                               │ 输入框         发送  │
│               │ 上一题 / 标记完成 / 下一题     │                     │
└───────────────┴───────────────────────────────┴─────────────────────┘
```

- 左栏固定约 `248px`，可以折叠。
- 中间为阅读和练习主区域，正文最大宽度约 `760px`。
- 右栏为 AI，宽度约 `380px`，可以折叠。
- 首版不实现拖动调整宽度，减少布局和状态复杂度。
- 三个区域允许独立滚动。
- 切换题目前先把未保存草稿写入 IndexedDB。

### 8.2 移动端

- 默认只显示中间主区域。
- 学习路线使用左侧抽屉。
- AI 使用右侧全屏抽屉。
- 阅读、代码练习、笔记使用顶部标签切换。
- 不要求移动端同时展示三栏。

### 8.3 保存状态

顶部只展示四种状态：

- 已保存
- 保存中
- 保存失败，可重试
- 尚未备份

“尚未备份”表示自上次导出 JSON 后已有新数据，提醒用户定期备份。

## 9. Linear 风格设计系统

### 9.1 设计原则

- 深色优先，同时支持浅色。
- 精确排版、紧凑控件、细边框和低对比层级背景。
- 主要使用列表、分栏和分隔线，避免卡片堆叠。
- 动画只用于抽屉、保存状态和 AI 流式响应。
- 不复制 Linear 的商标、图标或页面资产。

### 9.2 设计令牌

```css
:root {
  --bg: #0c0d0f;
  --surface-1: #111216;
  --surface-2: #17181d;
  --surface-3: #1e2026;
  --border: rgba(255, 255, 255, 0.08);
  --border-strong: rgba(255, 255, 255, 0.14);
  --text: #f2f3f5;
  --text-secondary: #a4a7ae;
  --text-tertiary: #71747c;
  --accent: #8b7cf6;
  --success: #4fbd8a;
  --warning: #d8a657;
  --danger: #e0646f;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
}
```

- UI 字体：`Inter Variable`，中文使用系统无衬线回退。
- 代码字体：`JetBrains Mono` 或系统等宽字体。
- 正文：`16px/1.8`。
- UI 控件：`13–14px`。
- 间距基线：4px。
- 常规过渡：`120–180ms`。
- 所有交互控件必须有 Hover、Focus、Disabled 和 Loading 状态。
- 尊重 `prefers-reduced-motion`。

### 9.3 核心组件

- `AppShell`
- `RoadmapTree`
- `CommandSearch`
- `ProblemHeader`
- `BookmarkToggle`
- `MarkdownArticle`
- `CodeBlock`
- `PracticeEditor`
- `EvaluationResult`
- `PrivateNotes`
- `AITutorPanel`
- `SaveIndicator`
- `SettingsDrawer`
- `BackupDialog`

## 10. Markdown 内容系统

### 10.1 内容来源

- 上游：`https://github.com/youngyangyang04/leetcode-master`
- 正文：`problems/**/*.md`
- 路线：根目录 `README.md`
- 本地元数据：`content/overrides/*.yml`

### 10.2 本地元数据

仅在自动解析无法确定时增加覆盖：

```yaml
slug: 0704-binary-search
sourcePath: problems/0704.二分查找.md
title: 704. 二分查找
category: 数组
order: 2
problemUrl: https://leetcode.cn/problems/binary-search/
```

不在首版维护难度、标签体系或大量人工分类。

### 10.3 构建流程

```text
手动执行同步命令
  → 拉取上游 Markdown
  → 读取 README 顺序
  → 生成稳定 contentId 和 slug
  → 规范化链接、代码语言和图片
  → 生成内容清单与搜索索引
  → 静态生成页面
  → 检查解析错误和死链
```

首版只提供手动命令，不配置定时同步或自动 PR。

### 10.4 渲染规则

- 使用 CommonMark/GFM，不直接执行上游 MDX。
- 原生 HTML 经过严格白名单净化。
- 禁止脚本、事件属性、未知 iframe 和危险 URL。
- 将相对 `.md` 链接转换为站内题目路由。
- 统一 `CPP`、`c++` 等代码语言标记。
- 图片限制最大宽度并支持点击查看。
- 外部链接显示目标域名。
- 页面底部显示来源和上游原文链接。

### 10.5 搜索

- 在构建时生成轻量静态索引。
- 搜索字段只有题号、标题、专题和正文。
- 排序规则：精确题号 > 标题 > 专题 > 正文。
- 不搜索私人笔记和 AI 消息。
- 不引入远程搜索服务。

## 11. 本地数据设计

### 11.1 存储选择

使用 IndexedDB 保存学习数据，使用 `localStorage` 保存少量 UI 偏好。

- IndexedDB：学习状态、笔记、伪代码、AI 消息。
- localStorage：主题、侧边栏开关、最后打开的题目。
- 建议使用 Dexie 简化 IndexedDB 事务和版本迁移。
- 不引入服务端数据库。

### 11.2 数据模型

```ts
interface ProblemState {
  contentId: string
  codexThreadId?: string
  status: 'not_started' | 'in_progress' | 'completed'
  isBookmarked: boolean
  noteMarkdown: string
  pseudocode: string
  lastReadAnchor?: string
  lastOpenedAt: string
  updatedAt: string
}

type MessageKind =
  | 'question'
  | 'answer'
  | 'evaluation_request'
  | 'evaluation_result'

interface ProblemMessage {
  id: string
  contentId: string
  role: 'user' | 'assistant'
  kind: MessageKind
  content: string
  codeSnapshot?: string
  evaluation?: EvaluationResult
  status: 'pending' | 'streaming' | 'completed' | 'failed'
  createdAt: string
}

interface LocalSettings {
  id: 'settings'
  theme: 'system' | 'dark' | 'light'
  preferredCodeStyle: 'pseudocode'
  tutorStyle: 'socratic' | 'direct'
  lastExportAt?: string
}
```

IndexedDB 表：

```text
problemStates: &contentId, status, lastOpenedAt, updatedAt
messages: &id, [contentId+createdAt], contentId, status
settings: &id
```

### 11.3 题目绑定约束

- `contentId` 是学习记录、伪代码和消息的唯一题目归属标识。
- 每个题目只有一条 `ProblemState`。
- 每个题目只有一个连续 AI 会话，不创建会话管理系统。
- `codexThreadId` 仅用于恢复模型上下文；IndexedDB 中的 `messages` 始终是界面记录的权威数据源。
- 题目页只查询当前 `contentId` 的消息。
- 切换题目时必须清空内存中的消息视图，然后加载新题消息。
- AI 请求路径包含 `contentId`；服务端根据该 ID加载题目内容。
- 客户端不能通过传入另一个题目的正文改变 AI 上下文。
- 导入数据时，未知 `contentId` 进入异常清单，不自动挂到其他题目。

### 11.4 自动保存

- 笔记和伪代码输入停止约 800ms 后保存。
- 收藏状态点击后立即保存，不使用防抖。
- 切换标签、切换题目和页面隐藏时立即保存。
- 保存失败时保留内存草稿并显示重试按钮。
- 不实现多端版本冲突，因为只有当前浏览器写入。

### 11.5 备份与恢复

设置抽屉提供：

- 导出全部数据为带版本号的 JSON。
- 从 JSON 恢复数据。
- 导入前显示记录数量和覆盖范围。
- 默认采用合并导入；同一记录使用 `updatedAt` 较新的版本。
- 提供“清空所有个人数据”，执行前二次确认。
- 数据结构包含 `schemaVersion`，为未来迁移保留能力。

## 12. 伪代码练习模式

### 12.1 编辑体验

- 默认且唯一正式模式为伪代码。
- 接受中文步骤、英文关键字以及自然语言混合输入。
- 不要求符合某一种编程语言语法。
- 使用 CodeMirror 6，也可在最初原型阶段使用普通 `textarea`。
- 提供行号、缩进、撤销、重做和快捷保存。
- 不提供运行按钮、测试用例执行或“通过率”。

### 12.2 一键评估流程

1. 用户点击“AI 评估思路”。
2. 客户端先把当前伪代码作为 `evaluation_request` 消息保存到本题记录。
3. 服务端加载当前题目的题面、约束和必要题解片段。
4. 服务端把题目上下文与伪代码发送给 AI。
5. AI 返回结构化评估。
6. 客户端把结果作为 `evaluation_result` 消息保存到同一道题。
7. 用户可以点击某条问题，在本题 AI 面板继续追问。

评估期间冻结本次提交快照。用户可以继续修改编辑器，但返回结果必须显示它对应的代码版本。

### 12.3 评估维度

- 是否理解题目目标
- 核心算法思路是否成立
- 数据结构选择是否合理
- 循环不变量或递归终止条件
- 状态定义与更新顺序
- 空输入和最小规模
- 越界、重复元素、溢出等边界问题
- 时间复杂度
- 空间复杂度
- 伪代码是否存在影响理解的歧义

### 12.4 评估结果

```ts
interface EvaluationResult {
  verdict: 'incomplete' | 'major_issues' | 'minor_issues' | 'sound'
  summary: string
  findings: Array<{
    severity: 'critical' | 'warning' | 'suggestion'
    title: string
    explanation: string
    relatedLines?: { from: number; to: number }
  }>
  counterexamples: Array<{
    input: string
    expectedBehavior: string
    observedRisk: string
  }>
  timeComplexity: string
  spaceComplexity: string
  nextStep: string
}
```

界面必须显示：

> AI 评估属于静态思路分析，未实际编译、运行或验证代码。

AI 默认指出缺陷与下一步，不主动给出完整参考答案。

## 13. 题目专属 AI 对话

### 13.1 对话规则

- AI 面板始终属于当前题目。
- 不提供全局聊天入口。
- 不提供多会话创建、重命名、归档和迁移。
- 进入新题目时，消息区只显示该题记录。
- 返回旧题时恢复该题全部消息。
- 伪代码评估也作为本题消息历史的一部分。

### 13.2 快捷提问

- 给我一个不泄露答案的提示
- 检查我的思路
- 哪个边界条件有问题
- 给出一个能失败的反例
- 分析时间和空间复杂度
- 解释刚才的评估
- 根据我的错误给一道相似练习

### 13.3 上下文

每次请求包含：

1. 固定的算法辅导规则。
2. 路由中的当前 `contentId`。
3. 当前题目的题面、约束和相关正文片段。
4. 当前保存的伪代码。
5. 本题最近若干条消息。
6. 用户本次输入。

不发送其他题目的笔记、代码或消息。

首版不实现向量数据库和自动长会话摘要。题目内容按 Markdown 标题切分，通过关键词选择相关片段；会话只发送最近固定数量的消息。

### 13.4 回答方式

- 默认优先给提示和追问。
- 用户明确要求时才给完整解法。
- 分析伪代码时引用行号。
- 对无法确定的判断明确表达不确定性。
- 不声称代码已经运行。
- AI 回复以安全 Markdown 渲染。

## 14. AI 与 Codex App Server 设计

### 14.1 服务端桥接

- Next.js 服务端维护单例 Codex App Server 子进程，默认使用稳定的 stdio 传输，不使用实验性 WebSocket。
- 启动后完成 `initialize`，通过 `account/read` 检查本机登录状态，通过 `model/list` 使用服务端推荐模型，不硬编码具体模型名称。
- 首次访问某题 AI 时调用 `thread/start`，固定辅导规则与该题正文，并把返回的线程 ID 保存到该题 `ProblemState.codexThreadId`。
- 后续请求恢复同一线程；若线程失效，则以当前题目、伪代码和最近消息重建线程，并更新线程 ID。
- 服务端把 App Server 的增量通知转换为浏览器可消费的流式事件。
- 子进程异常退出时终止在途请求并允许自动重启一次；不得把原始请求正文或认证信息写入日志。

### 14.2 普通问答

```text
POST /api/problems/[contentId]/chat
```

```ts
interface ChatRequest {
  message: string
  pseudocode?: string
  selectedText?: string
  recentMessages: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
}
```

服务端只接受消息历史，不接受客户端提交的题目正文；题目正文必须根据路径中的 `contentId` 从本地内容索引加载。

返回流式文本事件：

- `message.delta`
- `message.completed`
- `error`

### 14.3 伪代码评估

```text
POST /api/problems/[contentId]/evaluate
```

```ts
interface EvaluateRequest {
  pseudocode: string
}
```

使用 App Server `turn/start` 的 `outputSchema` 约束输出，返回符合 `EvaluationResult` 的结构化 JSON，并再次通过 Zod 校验。若结果格式校验失败，服务端最多自动修复一次，然后返回安全错误。

### 14.4 失败恢复

- 调用 API 前先把用户消息或评估请求保存为 `pending`。
- 流式回复过程中状态为 `streaming`。
- 成功后写入完整内容并改为 `completed`。
- 失败后保留请求并改为 `failed`，用户可点击重试。
- 重试创建新的响应消息，不覆盖原始请求。

## 15. 推荐技术栈

仅保留必要依赖：

- Next.js App Router
- React + TypeScript
- Tailwind CSS + CSS Variables
- Radix UI 基础无障碍组件，按 Linear 风格定制
- `react-markdown` / unified
- `remark-gfm` 与严格 HTML sanitize
- CodeMirror 6
- Dexie
- Zod
- 本地 `codex app-server` JSON-RPC 客户端与其生成的 TypeScript 协议类型

首版不引入：

- Supabase
- PostgreSQL
- Drizzle/Prisma
- TanStack Query
- Zustand/Redux
- Redis/KV
- 向量数据库
- 远程搜索服务

React 自有状态与少量 Context 足以处理当前界面状态。

## 16. 建议目录结构

```text
KILLCode/
├─ app/
│  ├─ page.tsx
│  ├─ problems/[slug]/page.tsx
│  ├─ api/problems/[contentId]/
│  │  ├─ chat/route.ts
│  │  └─ evaluate/route.ts
│  └─ layout.tsx
├─ components/
│  ├─ shell/
│  ├─ roadmap/
│  ├─ markdown/
│  ├─ practice/
│  ├─ ai/
│  ├─ codex/
│  └─ ui/
├─ content/
│  ├─ upstream/
│  ├─ overrides/
│  └─ generated/
├─ lib/
│  ├─ ai/
│  ├─ content/
│  ├─ local-db/
│  └─ validation/
├─ scripts/
│  ├─ sync-upstream.ts
│  ├─ build-content-index.ts
│  └─ check-content.ts
├─ styles/
│  ├─ tokens.css
│  └─ markdown.css
├─ tests/
│  ├─ unit/
│  └─ e2e/
└─ DESIGN.md
```

使用 `codex app-server generate-ts` 生成与本机 CLI 版本匹配的协议类型。KILLCode 不读取或复制 Codex 的认证文件；日志和错误页面不得显示凭据、令牌或完整用户输入。

## 17. 性能要求

- Markdown 页面在构建时生成。
- 题目正文不等待 IndexedDB 或 AI 加载即可显示。
- AI 和代码编辑器按需加载。
- 图片设置尺寸并延迟加载。
- AI 消息初次只读取当前题目的最近 50 条；需要时再加载更早记录。
- 搜索索引在构建时生成并按需加载。
- IndexedDB 写入失败不能阻塞正文阅读。

## 18. 安全与隐私

- 上游 Markdown 和 AI 回复都按不可信内容处理。
- 禁止脚本、事件属性和危险 URL。
- Markdown 中的文字只是 AI 参考材料，不得覆盖系统辅导规则。
- 用户伪代码只作为文本发送，不在服务器执行。
- Codex 认证完全交由 App Server 管理；应用不得读取、缓存或导出认证令牌。
- App Server 只能由服务端进程访问，线程以只读、无网络、无需批准的受限策略运行。
- 默认不记录请求正文到服务端日志。
- 错误日志只能包含请求 ID、题目 ID 和错误类型。
- 本地数据导出由用户主动触发，不自动上传到其他服务。
- “清空数据”必须列出将删除的记录数量并二次确认。

## 19. 测试策略

### 19.1 单元测试

- README 路线解析
- Markdown slug 与内部链接转换
- HTML 净化
- 搜索索引生成
- IndexedDB 数据迁移
- 收藏切换与收藏筛选
- 按 `contentId` 查询消息
- AI 上下文不得混入其他题目
- 评估结构校验
- JSON 导出与导入

### 19.2 端到端测试

1. 打开题目，状态变为学习中。
2. 收藏题目后刷新，收藏状态仍存在；首页“只看收藏”只显示收藏题目。
3. 写笔记并刷新，笔记仍存在。
4. 写伪代码并切换题目，返回后草稿恢复。
5. 一键评估后，代码快照和结果出现在本题消息中。
6. 修改伪代码再次评估，两次结果都可以回看。
7. 向 AI 提问，刷新后消息仍存在。
8. 切换题目，新题不显示上一题的对话。
9. 伪造另一个 `contentId` 的正文请求无效，服务端仍按路由加载内容。
10. AI 请求失败时，用户输入保留并可重试。
11. 导出数据、清空数据、重新导入后记录与收藏完整恢复。
12. `390px` 手机宽度下可完成阅读、收藏、伪代码输入和 AI 提问。

### 19.3 视觉验收

- 验证 1440px、1024px、768px 和 390px。
- 深色和浅色主题均满足可读性要求。
- 中文长标题和代码长行不造成页面整体横向溢出。
- 三栏密度、边框、排版与本文 Linear 风格令牌一致。
- 键盘焦点清晰，抽屉和命令搜索可用键盘关闭。

## 20. 开发阶段

### 阶段 1：内容与阅读

- 初始化 Next.js 与视觉系统。
- 完成 Markdown 同步、转换和内容校验。
- 完成首页路线、搜索和题目阅读页。

完成标准：可以从首页搜索并阅读全部可解析题目。

### 阶段 2：本地学习记录

- 完成 IndexedDB schema。
- 完成学习状态、收藏、笔记和伪代码自动保存。
- 完成 JSON 导出、导入和清空功能。

完成标准：刷新和重启浏览器后数据仍存在，备份可以恢复。

### 阶段 3：Codex AI 学习

- 检查 `codex` CLI、ChatGPT 登录状态和 App Server 协议兼容性。
- 完成受限的 App Server 子进程与 JSON-RPC 桥接。
- 完成题目绑定的流式问答。
- 完成伪代码结构化评估。
- 完成失败恢复和本地消息保存。

完成标准：所有 AI 消息与评估只出现在所属题目中。

### 阶段 4：体验与验证

- 完成基础移动端适配。
- 完成无障碍、性能和端到端测试。
- 修复 Markdown 异常和视觉问题。

完成标准：核心学习流程在桌面和手机浏览器均可完整使用。

## 21. MVP 验收标准

- 可以浏览官方顺序中的全部成功解析内容。
- 可以按题号和标题快速搜索。
- 每题可以保存状态、收藏、笔记和伪代码。
- 首页可以切换“只看收藏”，且不需要独立收藏页面。
- 每题拥有且只拥有一个独立 AI 消息历史。
- 任何题目都不会显示或发送其他题目的消息、笔记或伪代码。
- 一键评估返回缺陷、边界、反例、复杂度和下一步建议。
- 每次评估保留当时的伪代码快照。
- AI 失败不会丢失用户输入。
- 刷新和浏览器重启后学习数据能够恢复。
- JSON 导出和导入能够完整恢复数据。
- 浏览器无法获得 Codex 登录凭据、令牌或 App Server 传输通道。
- 不执行用户代码，不虚构编译或测试结果。
- 桌面和手机端均能完成核心学习流程。
- 页面明确显示上游内容来源。

## 22. 最终架构决策

1. **个人本地应用**：不设计用户和权限体系。
2. **IndexedDB 是唯一学习数据源**：不增加服务器数据库。
3. **每题一个连续 AI 会话**：不增加会话管理页面和多会话关系。
4. **评估也是消息**：伪代码快照和 AI 结果直接保存在该题消息历史，不增加独立评估表。
5. **伪代码优先**：不在首版支持多编程语言编辑和运行。
6. **内容静态、交互动态**：Markdown 构建时生成，学习记录和 AI 在浏览器运行时加载。
7. **Codex 订阅只由服务端桥接**：网页无登录，但浏览器不能直连 App Server；无外部访问控制时禁止公网部署。
8. **手动同步内容**：不增加定时任务和自动 PR。
9. **聚焦学习闭环**：阅读 → 思考 → 伪代码 → AI 评估 → 继续提问 → 完成。

按照这个范围，单人开发的合理目标是先在约 2–4 周内完成可用版本，再根据实际使用体验决定是否增加功能。
