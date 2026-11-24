# 贡献指南

感谢你愿意改进 PLXT。这是一个**零构建、纯前端**项目：没有打包器、没有框架、没有运行时依赖。提交改动前，请先阅读本文件与 [AGENTS.md](AGENTS.md)。

参与本项目即表示你同意遵守 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。

## 开始之前

- 先搜索现有 Issue，避免重复。
- 较大的功能或架构调整请先开 Issue 讨论，尤其是引入依赖、拆分模块或修改存储结构。
- 安全漏洞请按 [SECURITY.md](SECURITY.md) 私下报告，不要公开提交可利用细节。

## 本地开发

需要 Node.js 18+，仅用于预览与自检；运行页面本身不需要 Node。

Fork 并克隆仓库后，在项目根目录执行：

```bash
npm run serve        # http://127.0.0.1:8080/
npm run check        # 提交前必须通过
```

`npm run serve` 与 `npm run check` 只使用 Node 内置模块，无需 `npm install`。

可选格式化：

```bash
npm install
npm run format
npm run format:check
```

## 提交前检查

1. `npm run check` 必须零失败。
2. 至少手动验证受影响的路径；涉及流式、工具或导出的改动请覆盖对应场景。
3. 新增或修改界面文案时，确认中英文两种模式都没有残留。
4. 涉及运行时文件时，同步升级四处版本号并更新 `CHANGELOG.md`。
5. 确认没有提交 API Key、访问令牌、个人配置或 `.env` 文件。

## 代码约定

- **ES2017 兼容**：不使用 ESM、可选链 `?.`、空值合并 `??`、TypeScript 或前端框架。
- **全局命名空间**：只使用 `window.AI`；每个文件是一个 IIFE，并启用 `'use strict'`。
- **格式**：遵循 [.prettierrc.json](.prettierrc.json)：单引号、120 列、两空格缩进、LF。
- **注释**：使用英文，说明意图与约束，不复述代码。
- **界面文案**：中文为默认语言；英文通过 `08-i18n.js` 的 `AI.LEX` 或 `07`/`09` 中的 `L(zh, en)` 提供。
- **安全**：模型输出必须经 `AI.Render.sanitize`；禁止把未消毒内容写入 `innerHTML`。
- **降级**：可选库缺失、离线、存储配额失败都必须优雅降级，不得抛错中断主流程。

## 架构约束

- 脚本按 `01` → `09` 顺序加载。`07-extras.js` 与 `09-plus.js` 会包装先前模块的同名函数；修改 UI 函数前先搜索后续覆盖点。
- 新增 JS / CSS 资源时，必须同时加入 `sw.js` 的 `SHELL`，否则离线时缺失。
- 新增外部 CDN 域时，必须同时更新 `index.html` 的 CSP 与 `sw.js` 的 `CDN_HOSTS`。
- 保持 `file://` 可用：不要假定 `caches`、`serviceWorker`、`navigator.clipboard` 一定存在。
- 不要引入构建步骤、后端服务或运行时包管理。

## 版本与变更记录

版本号在四处保持一致：

1. `index.html` → `window.PLXT_BRAND.version`
2. `sw.js` → `VERSION`
3. `manifest.json` → `version`
4. `package.json` → `version`

任何影响运行时 JS / CSS 的改动都应升级版本，并在 [CHANGELOG.md](CHANGELOG.md) 中记录。

## 提交信息

使用 [Conventional Commits](https://www.conventionalcommits.org/)：

```text
feat: add gemini streaming fallback
fix: keep scroll lock after branch switch
docs: clarify offline vendor setup
refactor: extract usage normalization
test: cover sse early close
chore: bump version to 3.3.1
```

一个提交只做一件事。不要在同一个提交里混合格式化、重构和功能变更。

## Pull Request

1. 从 `main` 创建分支，例如 `feat/branch-compare`。
2. 完成改动并通过 `npm run check`。
3. 按模板填写 PR：说明动机、行为变化、验证方式与风险。
4. 确认没有提交密钥或个人信息。
5. 等待 CI 与维护者审查；根据反馈补充提交，不要强制推送覆盖他人工作。

维护者可能会要求拆分过大的 PR，或要求先补测试与文档。

## 文档

- 用户文档：`README.md`、[docs/USAGE.md](docs/USAGE.md)
- 部署与安全： [DEPLOY.md](DEPLOY.md)、[SECURITY.md](SECURITY.md)
- 维护者与 AI 代理须知：[AGENTS.md](AGENTS.md)

文档中的命令、路径和版本号必须能在当前仓库中验证。`npm run check` 会校验本地 Markdown 链接。