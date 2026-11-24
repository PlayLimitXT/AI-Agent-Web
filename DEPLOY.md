# 部署指南

PLXT 是纯静态站点。部署只需要把仓库目录原样放到静态托管，不需要安装依赖、执行构建或运行 Node 服务。

## 静态托管

| 平台 | 配置 |
| --- | --- |
| Nginx / Apache | 将仓库根目录设为站点根目录 |
| GitHub Pages | Settings → Pages → Deploy from a branch，选择 `main` 与 `/ (root)` |
| Netlify | Build command 留空，Publish directory 填 `.` |
| Vercel | Framework Preset 选 Other，Output Directory 填 `.`，无构建命令 |
| Cloudflare Pages | Build command 留空，Output directory 填 `.` |
| 对象存储 / CDN | 上传全部文件，保留相对路径与 `Content-Type` |

子路径部署（例如 `https://example.com/plxt/`）无需改代码：页面、Service Worker 与清单均使用相对路径。

## Nginx 示例

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    root /var/www/plxt;
    index index.html;

    # 入口、Service Worker 与清单始终保持新鲜；静态资源由 SW 管理缓存。
    add_header Cache-Control "no-cache" always;

    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src *; media-src 'self' blob: data:; worker-src 'self' blob:; child-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

说明：

- `script-src` 中的 `'unsafe-inline'` 与 `'unsafe-eval'` 是当前内联首帧脚本与可选增强库所需；收紧前必须先把内联脚本外置并完整回归。
- `connect-src *` 允许使用者配置任意模型 / 搜索 / MCP 端点。若部署面向固定服务商，建议收紧到实际域名。
- 新增 CDN 域时，必须同时更新 `index.html` 的 `meta` CSP 与 `sw.js` 的 `CDN_HOSTS`。
- `meta` 版本 CSP 无法表达 `frame-ancestors`、HSTS 等指令，生产环境优先使用响应头版本。
- 如果为不同 `location` 单独添加 `add_header`，Nginx 不会继承 `server` 级响应头；需要重复声明或使用 `include` 片段。

## CORS 与反向代理

浏览器直连模型 API 需要服务商允许跨域。若服务商不支持 CORS，可把它反代到同源路径：

```nginx
location /provider/ {
    proxy_pass https://api.example.com/;
    proxy_http_version 1.1;
    proxy_set_header Host api.example.com;
    proxy_set_header Authorization $http_authorization;
    proxy_set_header Content-Type $content_type;

    # SSE 流式响应必须关闭缓冲
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 3600s;
    add_header X-Accel-Buffering no;
}
```

然后在供应商设置中把 Base URL 填为 `https://example.com/provider/v1`（具体路径取决于服务商）。

注意：

- 只代理你信任的固定上游，不要做成开放代理。
- 限制允许的方法与请求头；必要时增加鉴权、速率限制与日志脱敏。
- 反代会看到 `Authorization` 头，请确保上游与服务器日志不会记录密钥。

## HTTPS 与 PWA

- Service Worker、PWA 安装与剪贴板等能力要求 HTTPS，`localhost` 例外。
- `file://` 直开可用，但不会注册 Service Worker，也没有离线缓存与安装入口。
- 建议启用 HSTS，并确保所有子路径都通过 HTTPS 提供。

## 缓存与更新

- `sw.js` 对导航请求使用 network-first，对同源静态资源使用 cache-first + 后台刷新。
- Service Worker 安装时不会 `skipWaiting`；页面提示有新版本后，由使用者确认更新，避免打断进行中的对话。
- 每次修改运行时 JS / CSS，请同步升级四处版本号：
  1. `index.html` → `window.PLXT_BRAND.version`
  2. `sw.js` → `VERSION`
  3. `manifest.json` → `version`
  4. `package.json` → `version`
- 建议对 `index.html`、`sw.js`、`manifest.json` 使用 `Cache-Control: no-cache`，避免边缘节点长期返回旧入口。

## 隐私与统计

仓库默认不包含分析或遥测脚本。若部署方自行加入统计、客服或第三方脚本：

1. 更新 CSP 的 `script-src` / `connect-src`。
2. 同步 `sw.js` 的 `CDN_HOSTS`（仅限需要缓存的静态库）。
3. 在隐私说明中明确披露数据去向。

## 上线前检查

```bash
npm run check
```

并在目标浏览器中手动验证：

- 三种协议各完成一次流式对话。
- 停止与继续生成。
- 导出、导入与脱敏配置。
- 断网后的离线兜底页。
- 版本升级后的更新提示。
- 控制台无 CSP 报错。