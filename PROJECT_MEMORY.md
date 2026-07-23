# PROJECT_MEMORY

## 目标

开发一个基于微信读书官方 Agent API 的 Web 笔记工作台，参考 v2cb.com 的“连接、同步、统计、回顾”产品路径，但保持独立的信息架构与视觉。

## 已完成

- 核对 `Tencent/WeChatReading` 1.0.4 的官方接口契约。
- 验证官方网关 `https://i.weread.qq.com/api/agent/gateway` 的浏览器 CORS 只允许 `https://weread.qq.com`。
- 初始化 vinext / Next.js / Cloudflare Worker 项目。
- 完成连接页、阅读总览、书目搜索、按章节笔记、Markdown 复制与下载。
- 增加同域只读代理、API 白名单、参数白名单、20 秒超时和 `no-store` 响应。
- API Key 默认只保留在 React 内存状态；用户可主动选择以明文保存到当前浏览器 `localStorage`，界面会提示私人设备与恶意扩展风险，取消保存或断开连接时清除。
- 为官方笔记计数口径、时长格式化、网关参数和章节合并补充单元测试。
- 使用临时 Key 完成真实接口联调：笔记本、月度统计、划线、想法和章节目录均成功返回。
- 修复 Cloudflare Worker 不支持 `redirect: error` 的兼容问题，改用 `manual` 并拒绝 3xx。
- 处理真实回包中划线章节 UID 与目录不一致的问题：通过想法的 `abstract` 和正确章节 UID 回填划线章节。
- 完成 v2cb 公开前端数据链路分析，详见 `docs/v2cb-data-flow.md`。
- 将项目内品牌、组件、文件和包名统一为 `WeRead`。
- “在微信读书打开”按微信读书官方 Web 前端算法把 API 数字 `bookId` 编码成 Reader ID；已编码且校验有效的 Reader ID 保持不变，不再把数字 ID 直接拼进阅读器地址。
- 增加手动同步入口，重新获取书目、当前统计周期和当前打开书籍的笔记；同步失败时保留原有数据。
- 书库增加按书名/作者搜索，以及“最近阅读 / 笔记最多 / 书名排序”；最近阅读优先使用 `/shelf/sync` 的 `readUpdateTime`。
- 增加独立数据看板，支持本周、本月、今年、全部四个周期，展示阅读时长、自然日均、阅读节奏、分类偏好、24 小时时段和 Top 书籍。
- 提升数据看板 Top 书籍标题至 14px，并使用中文衬线字体提高长书名可读性。
- 提升分类偏好名称至 14px、偏好提示至 12px；阅读节奏柱状图增加鼠标悬浮与键盘聚焦气泡，展示具体周期和阅读时长。
- 完成全局字号审查：原 8px 字号统一提升至 12px、原 9px 提升至 13px，并将其余 10–11px 辅助字号协调到 12–13px；当前显式像素字号下限为 12px。
- 书库扩展为完整书架，合并笔记本与 `/shelf/sync` 数据，支持全部书架、有笔记、电子书、有声书范围及文章收藏入口；品牌字标改用独立书页图形组件。
- 增加宝塔面板源代码构建与 Node 部署教程，采用 `127.0.0.1:3100` 的 vinext 服务、宝塔 PM2 守护和 Nginx HTTPS 反向代理；明确不能按纯静态站部署。
- 增加 `scripts/baota-update.sh` 更新脚本：校验 Node LTS、分支和干净工作区，只允许 fast-forward 拉取，随后执行锁定依赖安装与生产构建；成功后由用户在宝塔面板手动重启并验收。
- 补齐网站分享元数据：canonical、robots、Open Graph、Twitter Card、favicon 和 Apple Touch Icon；新增 512×512 高对比书页分享封面，供微信分享卡片抓取。
- 接入微信公众号 JS-SDK 分享：发布域名验证文件，服务端按同源页面生成 SHA-1 签名并缓存 `access_token/jsapi_ticket`，微信内调用 `updateAppMessageShareData` 和 `updateTimelineShareData`；公众号 AppID 可公开，AppSecret 仅通过服务器运行时环境读取。
- 增加仅由 `?wechatDebug=1` 启用的微信分享诊断面板：展示微信环境、SDK 加载、页面签名、权限配置和分享接口五个阶段，并在 Android 微信中开启 JS-SDK 原生调试提示；诊断信息不包含 AppSecret、Token、ticket 或签名。
- 微信分享诊断确认旧个人未认证公众号在 `wx.ready` 后返回 `updateAppMessageShareData:permission denied`；代码已改为从服务器环境同时读取 `WECHAT_APP_ID` 和 `WECHAT_APP_SECRET`，方便切换至已认证服务号且不再硬编码账号。
- 已认证服务号下现代分享接口返回 `ok` 但 Android 实际仍发送裸链接；保留现代接口并增加官方旧版分享菜单 API 兼容注册，诊断面板会记录实际转发菜单触发、取消或完成状态。

## 关键决定

- 不二次开发或重新打包官方 Skill；Web 页面直接使用同一官方网关。
- 首版主路径是“连接 -> 阅读总览 -> 选择书籍 -> 回顾/导出笔记”。
- 不使用 D1、R2 或账号体系；后续若需要跨设备持久化，必须先重新评估 API Key 与用户数据的存储模型。
- 不在前端直连官方网关，因为实际预检响应不允许第三方 Origin。
- 官方 `/shelf/sync` 是读取书架的接口，不是触发缓存同步；当前无缓存架构下的“同步”直接重新请求现用数据接口。
- 微信分享签名接口只接受 `https://wereadnotes.tedxiong.com` 同源 URL，拒绝跨域签名；不向客户端或错误响应暴露 AppSecret、access token、jsapi ticket 或微信上游错误详情。

## 验证状态

- `npm test`：40 项通过（含完整生产构建、宝塔更新保护、微信账号环境配置、JS-SDK 签名与同源限制、分享元数据与品牌资源、API Key 可选存储、书库排序、周期标签、Reader ID 转换、同步流程与最小字号回归测试）。
- `npm run lint`：通过。
- `npx tsc --noEmit`：通过。
- `npm audit --omit=dev`：0 个生产依赖漏洞。
- 本地 HTTP：`/` 返回 200；无 API Key 请求 `/api/weread` 返回 401 且带 `no-store`。
- 真实数据脱敏验证：10 本笔记书目、月度统计正常；抽样书籍 7 条划线与 7 条想法最终归入 3 个正确章节，0 个未归类。

## 待完成

- 在浏览器中完成一次端到端交互确认后，决定是否发布 Sites 预览版本。
- 如需跨设备同步，先评审 API Key 加密、数据保留和删除策略；当前不引入数据库。
- 新认证服务号的验证文件已替换；待在新服务号配置 JS 接口安全域名和服务器出口 IP 白名单，并在宝塔 `.env.production.local` 中填写新 `WECHAT_APP_ID` / `WECHAT_APP_SECRET` 后真机复验。

## 主要文件

- `app/WeReadApp.tsx`：主要产品界面与数据加载流程。
- `app/api/weread/route.ts`：官方网关的安全同域代理。
- `app/lib/weread-core.ts`：接口白名单、数据口径和笔记合并逻辑。
- `app/lib/weread-sync.ts`：手动同步的数据加载协调与部分失败策略。
- `app/globals.css`：视觉系统与响应式布局。
- `scripts/baota-update.sh`、`tests/baota-update.test.mjs`：宝塔安全更新脚本及成功、脏工作区、Node 版本和构建失败回归测试。
- `tests/weread-core.test.ts`、`tests/rendered-html.test.mjs`：自动化验证。
- `public/favicon.svg`、`public/share-cover.svg`、`public/share-cover.png`：站点图标与社交分享封面资源。
- `app/api/wechat/jssdk/route.ts`、`app/lib/wechat-jssdk.ts`、`app/components/WeChatShareSetup.tsx`：微信分享签名、缓存、同源校验和客户端 JS-SDK 配置。
- `public/MP_verify_AlUm3Z2EKx03wrrt.txt`：新认证服务号的 JS 接口安全域名验证文件。
