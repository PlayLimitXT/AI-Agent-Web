# 安全策略

## 支持版本

| 版本 | 支持状态 |
| --- | --- |
| 3.3.x | ✅ 接收安全修复 |
| < 3.3 | ❌ 请先升级 |

## 报告漏洞

请**不要**通过公开 Issue 报告可利用的安全问题。

优先使用 GitHub 仓库的 **Security → Report a vulnerability** 私密报告。若该入口尚未启用，可发送邮件至 `PlayLimitXT@gmail.com`，主题注明 `PLXT Security`。

报告中请尽量包含：

- 受影响的版本与部署方式（HTTP / `file://` / 子路径）
- 复现步骤或最小 PoC
- 影响范围（数据泄露、XSS、密钥读取、缓存污染等）
- 浏览器与操作系统
- 你希望公开披露的时间

维护者会尽快确认并评估。在修复发布前，请避免公开细节。修复完成后，如果你愿意，可以在 `CHANGELOG.md` 中署名致谢。

## 数据模型

PLXT 没有自建后端。以下数据只存在于使用者浏览器：

| 数据 | 位置 |
| --- | --- |
| 会话、设置、供应商配置、日志、用量 | `localStorage['ai-chat-pro-v3']` |
| 可分离保存的敏感字段 | `localStorage` / `sessionStorage` 的 `ai-chat-pro-v3-secrets`，或仅内存 |
| 旧版迁移来源 | `localStorage['plxt-ai-chat-v3']` |

模型、搜索与 MCP 请求由浏览器直接发往使用者配置的端点。项目不运营中转服务，也无法读取使用者的本地数据。

密钥存储模式：

- `localStorage`：刷新与重开浏览器后仍保留。
- `sessionStorage`：关闭标签页后失效。
- 仅内存：刷新即失效。

导出 JSON 备份时，非 `localStorage` 模式不会包含 API Key。

## 威胁模型

项目重点防御以下风险：

1. **模型输出注入**：Markdown 经 DOMPurify 消毒，移除内联样式、`iframe`、`form` 等危险节点，并限制图片 `src`。
2. **第三方内容注入**：检索结果、MCP 工具输出与附件内容均按数据处理，不作为指令执行。
3. **供应链**：核心库 `marked` 与 `DOMPurify` 内置于 `vendor/`；可选库从固定 CDN 加载，并有超时与降级。
4. **跨站脚本与点击劫持**：CSP 限制脚本 / 样式来源，禁用 `object-src`，限制 `base-uri`；部署文档提供 `frame-ancestors` 响应头示例。
5. **缓存污染**：Service Worker 只缓存同源资源与白名单 CDN；导航采用 network-first。
6. **本地数据误用**：导出配置默认脱敏；错误日志只保存在本机内存。

不在防御范围内：

- 服务商、搜索供应商或 MCP 服务器自身的数据处理与日志。
- 浏览器扩展、恶意软件、已被入侵的操作系统或物理设备访问。
- 使用者主动把 API Key 粘贴到不可信页面或分享带密钥的配置。
- 因密钥泄露产生的第三方账单。

## 部署加固清单

- 使用 HTTPS；PWA 与 Service Worker 不应在明文 HTTP 上启用。
- 使用 [DEPLOY.md](DEPLOY.md) 中的响应头版本 CSP，补充 `frame-ancestors`、HSTS、`X-Content-Type-Options` 与 `Referrer-Policy`。
- 如无必要，将 `connect-src *` 收紧到实际使用的服务商域名。
- 不要把 API Key 写入源码、构建产物或示例配置。
- 可选增强库如需完全离线，放入 `vendor/` 并设置 `window.AI_OFFLINE_VENDOR = true`。
- 定期升级 `vendor/` 中的第三方库，并关注上游安全公告。
- 若自行加入统计或第三方脚本，必须同步更新 CSP 与 `sw.js` 的 `CDN_HOSTS`，并在隐私说明中披露。

## 安全相关的不变量

`npm run check` 会验证其中一部分：

- 模型 HTML 必须经过 `DOMPurify.sanitize`。
- `index.html` 必须保留 CSP，且包含 `object-src 'none'` 与 `base-uri 'self'`。
- 运行时文件不得残留 `debugger` 或 `console.log`。
- 仓库不得包含分析脚本。
- Service Worker 的 `SHELL` 必须覆盖应用外壳。