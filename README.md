# KILLCode

个人本地算法学习网页：读取代码随想录 Markdown，为每题保存进度、收藏、笔记、伪代码、AI 评估与独立对话记录。

## 前置条件

- Node.js 20+
- Codex CLI，且终端中 `codex login status` 显示已通过 ChatGPT 登录

## 从 GitHub 克隆

上游题库通过 Git 子模块固定版本，请连同子模块一起克隆：

```powershell
git clone --recurse-submodules https://github.com/yzqnSKY/KILLCode.git
cd KILLCode
```

如果已经普通克隆，请先运行 `git submodule update --init --recursive`，再按下方说明启动。

## 启动

最简单的方式：双击项目根目录的 `一键启动 KILLCode.cmd`。入口会检查运行环境，首次启动时自动安装依赖，自动避开被占用的 3000–3010 端口，服务就绪后再打开浏览器；命令窗口需要保持开启，按 `Ctrl+C` 或关闭窗口即可停止服务。启动失败时窗口会保留错误信息。

也可以手动启动：

```powershell
npm install
npm run content:build
npm run dev
```

访问 `http://127.0.0.1:3000`。若端口占用，Next.js 会显示实际地址。

更新上游 Markdown 时运行 `npm run content:sync`。命令会对已有仓库执行 fast-forward 更新（首次运行则浅克隆）、记录 commit，并重建索引；本地修正规则放在 `content/overrides/`，不要直接修改上游目录。

## 验证

```powershell
npm run content:check
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

AI 由 Next.js 服务端启动本机 `codex app-server` 并通过 stdio 桥接。浏览器不会获得 Codex 凭据，也不会执行伪代码。学习数据保存在当前浏览器 IndexedDB，请在“数据”中定期导出 JSON 备份。

这是静态思路教练，不是在线判题器：评估不会编译或执行代码。App Server 使用只读沙箱、关闭网络并禁止审批；每道题只绑定一个持续的 Codex thread 和一份本地消息历史。

## 排序合集

侧栏“排序合集”或 `/collections/sorting-100` 提供东大情报生命排序训练的 100 题，分 8 个模块，每类按简单、中等、困难排列；A/B/C 是考试相关程度。题单在 `content/collections/sorting-100.json` 中人工维护，修改后运行 `npm run content:build`。

已收录题目复用已有内容 ID，因此收藏、进度、笔记及 AI 对话共享。新题的原创题意摘要与训练指南存放在 `content/local/sorting-100/`，完整约束与示例通过每页的 LeetCode 原题链接查看。合集中的上一篇、下一篇和返回按钮保持合集顺序。上游同步不会覆盖本地题单。

上游内容来自 [youngyangyang04/leetcode-master](https://github.com/youngyangyang04/leetcode-master)，页面保留原文链接；当前项目仅定位为个人本地学习工具。

## 动态规划合集

- 入口：`/collections/dynamic-programming-100`，10 个模块、100 个题号；每类由简单到困难，A 核心、B 迁移、C 进阶。
- 手动维护 `content/collections/dynamic-programming-100.json` 中的顺序、分类和训练重点，运行 `npm run content:build` 生成索引。
- 重用题库已有内容及 contentId，学习进度、收藏与笔记共享；新增题的原创摘要位于 `content/local/dynamic-programming-100/`，完整题面通过 LeetCode 链接查看。
- 生物序列比对等真题补充见本次交付的《东大CBMS动态规划精选100题》；100 道 LeetCode 题不代表覆盖全部 CBMS 算法。

## 考点覆盖与补充学习说明

两个合集均提供 `/study-guides/cbms-coverage` 入口。材料源文件为 `content/study-guides/cbms-coverage.md`，包含未充分覆盖的考点、22 个专项补题及学习材料。本页作为学习说明独立展示，不计入每个合集的 100 题及进度。
