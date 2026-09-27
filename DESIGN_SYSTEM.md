# KILLCode 视觉系统

视觉规范来自 `design/concepts/` 中四张实现概念图，并在真实浏览器中复核。

- 背景：真黑灰 `#0b0c0f`；主要表面 `#101216`；次级表面 `#16191f`。
- 文本：主文字 `#f1f3f7`，辅助文字 `#9299a6`，弱文字 `#636a76`。
- 强调：电紫 `#8b5cf6`；成功 `#35cc77`；错误 `#ff646f`。
- 容器：开放式分栏与横向条带优先；仅编辑器、路线列表和浮层使用完整边框容器。
- 边框：1px 冷灰细线；圆角以 7px、10px 为主；阴影只用于抽屉和移动浮层。
- 排版：Inter/系统无衬线，中文回退 Microsoft YaHei；正文 14–15px，控制文字 11–14px。
- 动效：150–180ms 的颜色和位置过渡；遵守 `prefers-reduced-motion`。
- 图标：Lucide 线性图标，通常 15–20px、1.7px 描边。
- 响应式：桌面固定窄导航与分栏；820px 及以下隐藏侧栏，使用底部导航和题目 AI 底部抽屉。

概念图：

- `design/concepts/roadmap-desktop.png`
- `design/concepts/problem-ai-desktop.png`
- `design/concepts/practice-evaluation-desktop.png`
- `design/concepts/practice-mobile.png`
