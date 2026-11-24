# Changelog

本项目的所有重要变更记录在此文件中。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

## [3.3.0] - 2026-11-24

首个公开发布快照。此前版本未在本仓库中保留提交历史。

### Added

- 零构建的静态 AI 工作台：Chat Completions 兼容、Anthropic Messages、Gemini generateContent 三套协议适配器。
- 树状分支对话、重新生成、编辑重答、换模型分支、会话派生、分支树视图。
- 上下文裁剪策略、压缩摘要、长期记忆、世界书、自动标题与时间注入。
- 内置工具、联网搜索、MCP Streamable HTTP、工具审批与最多 12 轮 Agent 循环。
- 流式思考 / 工具 / 正文交错时间线，Markdown 消毒，可选 KaTeX、Mermaid、代码高亮、PDF、DOCX 与二维码支持。
- 6 套设计语言 × 明暗模式、中英文界面、键盘可达与减少动态效果适配。
- Markdown / HTML / TXT / JSONL / CSV / 脱敏配置导出，完整 JSON 备份，日志 CSV，用量统计与二维码分享。
- PWA 离线外壳、离线兜底页、用户确认式更新与多标签同步。
- 仓库工程化：MIT License、README、使用说明、部署与安全文档、贡献指南、行为准则、Issue / PR 模板、GitHub Actions CI。
- 零依赖 `scripts/serve.mjs` 本地预览服务器与 `scripts/check.mjs` 仓库自检。

