# WeRead Notes 宝塔面板构建与部署教程

这份教程适用于当前仓库：

- GitHub：<https://github.com/xiongwei-git/WeReadNotes>
- 运行方式：`vinext` Node 服务
- 项目目录示例：`/www/wwwroot/WeReadNotes`
- 内部监听地址：`127.0.0.1:3100`

域名解析由你自行处理。域名可用后，仍需要在宝塔中配置 Nginx 反向代理和 HTTPS。

> [!IMPORTANT]
> WeRead Notes 不是纯静态网站。`/api/weread` 必须由 Node 服务处理，所以不能只把 `dist/client` 上传到网站根目录，也不能把 `3100` 端口直接暴露到公网。

## 一、最终结构

```text
浏览器
  │ HTTPS :443
  ▼
宝塔 Nginx
  │ http://127.0.0.1:3100
  ▼
WeRead Notes / vinext（宝塔 PM2 守护）
  ├── HTTPS :443 出站 → i.weread.qq.com
  └── HTTPS :443 出站 → api.weixin.qq.com（微信分享签名）
```

宝塔负责运行和守护 Node 服务，Nginx 负责域名、HTTPS 和反向代理。项目不需要 MySQL，也不需要在服务器环境变量中配置微信读书 API Key。

## 二、安装运行环境

在宝塔面板完成以下准备：

1. `软件商店`中确认已安装 Nginx。
2. 安装`Node 版本管理器`。
3. 在 Node 版本管理器中安装 Node.js 24 LTS，当前已验证版本为 `24.18.0`；也支持 `22.13.0` 以上的 Node 22 LTS。
4. 进入`网站 → Node 项目`，把命令行 Node 版本切换到刚安装的版本。

打开宝塔终端或通过 SSH 检查：

```bash
node -v
npm -v
git --version
```

不要使用已经停止支持的 Node 23 等奇数版本。如果终端和 Node 项目使用的版本不同，需要在宝塔 Node 版本管理器中分别确认。

## 三、在服务器拉取代码

首次部署使用 HTTPS 克隆，不需要在服务器配置 GitHub SSH 私钥：

```bash
cd /www/wwwroot
git clone https://github.com/xiongwei-git/WeReadNotes.git
cd /www/wwwroot/WeReadNotes
```

确认当前版本：

```bash
git status -sb
git log -1 --oneline
```

如果目录已经存在，不要再次克隆，使用后文的“更新部署”流程。

## 四、安装依赖并构建

在项目目录执行：

```bash
cd /www/wwwroot/WeReadNotes
npm ci
npm run build
```

注意：

- 必须使用普通的 `npm ci`，不要添加 `--omit=dev`。当前构建和启动所需的 `vinext` 位于开发依赖中。
- 不要上传本地 macOS 的 `node_modules`；依赖应当在宝塔的 Linux 环境中安装。
- 不要执行 `chmod -R 777`。出现权限问题时，只给宝塔 Node 项目的实际运行用户授予项目目录所需权限。

构建成功时，终端会出现 `Build complete`，并生成：

```text
dist/client/
dist/server/
```

当前版本可能输出一条“部分路由无法静态分类”的提示。这是 `vinext` 对动态 API 路由的分析提示；只要最终出现 `Build complete`，它就不是构建失败。

如果服务器资源充足，可以在首次上线前追加检查：

```bash
npm run lint
npx tsc --noEmit
npm test
```

`npm test` 会再次执行一次生产构建。

## 五、先在终端验证启动

在创建宝塔 Node 项目前，先运行：

```bash
cd /www/wwwroot/WeReadNotes
npm run start -- --hostname 127.0.0.1 --port 3100
```

看到以下信息表示 Node 服务启动成功：

```text
[vinext] Production server running at http://127.0.0.1:3100
```

保持这个终端暂时不关闭，另开一个终端检查首页：

```bash
curl -I http://127.0.0.1:3100/
```

预期状态为：

```text
HTTP/1.1 200 OK
```

再检查服务端 API 路由：

```bash
curl -i -X POST http://127.0.0.1:3100/api/weread \
  -H 'Content-Type: application/json' \
  -d '{"api_name":"/user/notebooks"}'
```

因为没有提供 API Key，预期返回：

```text
HTTP/1.1 401 Unauthorized
cache-control: no-store
```

这说明 `/api/weread` 确实由 Node 服务处理。验证完成后在第一个终端按 `Ctrl+C` 停止临时服务。

## 六、添加宝塔 Node 项目

进入`网站 → Node 项目 → 添加 Node 项目`。不同宝塔版本的字段名称可能略有不同，按下面填写：

| 配置项 | 填写内容 |
| --- | --- |
| 项目名称 | `WeReadNotes` |
| 项目路径 | `/www/wwwroot/WeReadNotes` |
| Node 版本 | `22.13.0` 或更高 |
| 项目端口 | `3100` |
| 启动文件 | `node_modules/vinext/dist/cli.js` |
| 启动参数 | `start -H 127.0.0.1 -p 3100` |
| 运行模式 | 单实例 / Fork |
| 自动启动 | 开启 |

如果你的宝塔版本提供的是“自定义启动命令”，填写：

```bash
npm run start -- --hostname 127.0.0.1 --port 3100
```

两种方式任选一种，不要同时配置。

启用后文的微信公众号 JS-SDK 分享卡片后，需要让 Node 在运行时读取本地密钥文件。此时改用“自定义启动命令”：

```bash
node --env-file=.env.production.local node_modules/vinext/dist/cli.js start -H 127.0.0.1 -p 3100
```

`.env.production.local` 已被 Git 忽略，不会被更新脚本覆盖或提交到仓库。

提交后在 Node 项目列表确认状态为`运行中`，然后再次执行：

```bash
curl -I http://127.0.0.1:3100/
```

仍然返回 `200` 才继续配置 Nginx。

## 七、配置 Nginx 反向代理

域名对应的网站创建完成后，进入：

```text
网站 → 对应站点 → 反向代理 → 添加反向代理
```

填写：

| 配置项 | 填写内容 |
| --- | --- |
| 代理名称 | `WeReadNotes` |
| 目标 URL | `http://127.0.0.1:3100` |
| 发送域名 | `$host` |
| 内容替换 | 留空 |
| 缓存 | 关闭 |

反向代理必须覆盖整个站点，包括 `/api/weread`，不能只代理首页。

如果需要手动核对 Nginx 配置，核心规则应类似：

```nginx
location / {
    proxy_pass http://127.0.0.1:3100;
    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_connect_timeout 10s;
    proxy_read_timeout 35s;
    proxy_send_timeout 35s;

    proxy_buffering off;
    proxy_cache off;
}
```

使用宝塔“反向代理”界面后，通常不需要再手工添加一份相同的 `location /`，否则可能产生重复配置。

## 八、HTTPS 和端口要求

域名可用后，在站点的 `SSL` 页面申请或部署证书，并开启强制 HTTPS。

安全要求：

- 公网只开放 `80` 和 `443`；不要在云服务器安全组或宝塔防火墙中开放 `3100`。
- Node 服务绑定 `127.0.0.1`，只能由本机 Nginx 访问。
- 服务器需要允许出站访问 `i.weread.qq.com:443`。
- 启用微信分享卡片时，还需要允许出站访问 `api.weixin.qq.com:443` 和 `res.wx.qq.com:443`。
- 不要把微信读书 API Key 写入项目源码、宝塔环境变量或 Nginx 配置。
- 用户应当只在 HTTPS 页面输入 API Key。

## 九、配置微信公众号 JS-SDK 分享卡片

项目已内置公众号 `AppID`：`wx1a90de06643413f0`。`AppID` 是公开标识；`AppSecret` 是服务端密钥，绝不能写进源码、Git、Nginx、聊天记录或前端环境变量。

### 1. 部署域名验证文件

完成代码更新和构建后，确认微信要求的验证文件可访问：

```bash
curl -fsS https://wereadnotes.tedxiong.com/MP_verify_GFIDeZ0v0AsWIl2j.txt
```

预期只输出：

```text
GFIDeZ0v0AsWIl2j
```

然后在微信公众平台的“设置与开发 → 公众号设置 → 功能设置”中，把下面的域名配置为“JS接口安全域名”，不填写协议或路径：

```text
wereadnotes.tedxiong.com
```

### 2. 配置服务器 IP 白名单

在公众号“开发接口管理 / 基本配置”的 IP 白名单中，加入这台阿里云服务器对外访问互联网时使用的固定公网 IPv4。应以阿里云控制台显示的 EIP/公网 IP 为准；不要填写 `127.0.0.1`、内网 IP 或域名。

微信的 `access_token` 接口会校验来源 IP。白名单遗漏时，站点本身仍可打开，但签名接口会返回 `502`，微信分享配置不会生效。

### 3. 在服务器保存 AppSecret

在宝塔终端执行以下命令。输入时不会回显 AppSecret，也不会把它写进 Shell 历史：

```bash
cd /www/wwwroot/WeReadNotes
umask 077
read -rsp '请输入公众号 AppSecret：' WECHAT_SECRET
printf '\n'
printf 'WECHAT_APP_SECRET=%s\n' "$WECHAT_SECRET" > .env.production.local
unset WECHAT_SECRET
chown www:www .env.production.local
chmod 600 .env.production.local
```

不要把 `.env.production.local` 内容发到聊天、Issue 或日志中。

### 4. 修改启动命令并验证

在宝塔 Node 项目中把启动方式改为“自定义启动命令”：

```bash
node --env-file=.env.production.local node_modules/vinext/dist/cli.js start -H 127.0.0.1 -p 3100
```

保存并重启项目，然后验证签名接口：

```bash
curl -i 'http://127.0.0.1:3100/api/wechat/jssdk?url=https%3A%2F%2Fwereadnotes.tedxiong.com%2F'
```

预期为 `HTTP/1.1 200 OK`，JSON 中包含 `appId`、`timestamp`、`nonceStr` 和 `signature`，但绝不会包含 `AppSecret`、`access_token` 或 `jsapi_ticket`。

如果返回：

- `503 NOT_CONFIGURED`：Node 没有读取到 `.env.production.local`，检查启动命令、文件权限并重启。
- `502 WECHAT_UPSTREAM_ERROR`：优先核对 AppSecret、公众号 AppID、服务器公网 IP 白名单和 `api.weixin.qq.com:443` 出站网络。

签名接口返回 `200` 后，在微信内置浏览器打开首页，通过右上角“转发给朋友”测试卡片。不要用复制粘贴 URL 的方式判断 JS-SDK 是否生效。

## 十、上线验收

依次完成以下检查：

1. Node 内网首页：

   ```bash
   curl -I http://127.0.0.1:3100/
   ```

   预期 `200`。

2. 域名首页：

   ```bash
   curl -I https://你的域名/
   ```

   预期 `200`。

3. 未登录 API：

   ```bash
   curl -i -X POST https://你的域名/api/weread \
     -H 'Content-Type: application/json' \
     -d '{"api_name":"/user/notebooks"}'
   ```

   预期 `401`，并带有 `Cache-Control: no-store`。

4. 浏览器打开 HTTPS 页面，输入临时 API Key，确认可以加载书目。
5. 点击`同步`，确认书目、统计和当前书籍笔记可以重新获取。
6. 打开任意书籍，确认“在微信读书打开”能进入正确 Reader 页面。

完成以上检查后才算部署完成。

## 十一、以后更新版本

代码推送到 GitHub 后，在宝塔终端执行仓库自带的更新脚本：

```bash
cd /www/wwwroot/WeReadNotes
bash scripts/baota-update.sh
```

脚本会依次完成：

1. 检查 Node.js、npm、当前分支和 Git 工作区。
2. 使用 `git pull --ff-only origin main` 获取更新。
3. 使用 `npm ci` 按锁文件重新安装依赖。
4. 执行生产构建并检查 `dist/client`、`dist/server/index.js`。
5. 输出更新前后的提交版本和上线验收命令。

为避免误操作宝塔独立管理的 PM2 环境，脚本不会自动重启服务。只有看到“更新构建完成”后，才进入宝塔 `Node 项目`点击`重启`。重启后执行：

```bash
curl -I http://127.0.0.1:3100/
```

预期返回 `HTTP/1.1 200 OK`，然后再检查域名和同步功能。

如果服务器工作区存在未提交修改、Node 版本不受支持、拉取失败、依赖安装失败或构建失败，脚本会立即停止并提示不要重启。

需要手动执行时，等价命令是：

```bash
git status -sb
git pull --ff-only origin main
npm ci
npm run build
```

如果 `git status` 显示服务器上存在未提交修改，先停止更新并确认这些修改的来源，不要直接覆盖。

## 十二、回滚到上一个版本

先查看最近提交：

```bash
cd /www/wwwroot/WeReadNotes
git log --oneline -5
```

切换到确认可用的旧提交：

```bash
git switch --detach 旧提交哈希
npm ci
npm run build
```

构建成功后在宝塔中重启 Node 项目。以后恢复到最新主分支：

```bash
git switch main
git pull --ff-only
npm ci
npm run build
```

然后再次重启 Node 项目。

## 十三、常见问题

### 页面返回 502

通常是 Node 服务没有运行或反向代理端口不一致：

```bash
curl -I http://127.0.0.1:3100/
ss -lntp | grep ':3100'
```

同时查看宝塔 Node 项目的运行日志。先让本机 `127.0.0.1:3100` 返回 `200`，再检查 Nginx。

### `vinext: command not found`

依赖没有完整安装。回到项目目录执行：

```bash
npm ci
```

不要使用 `npm ci --omit=dev`，也不要只上传 `dist/client`。

### 构建时提示 Node 版本不符合要求

检查：

```bash
node -v
which node
```

然后在宝塔 Node 版本管理器中把“命令行版本”和 Node 项目版本都切换到 Node 24 LTS（已验证 `24.18.0`），或 `22.13.0` 以上的 Node 22 LTS。

### 首页正常，但连接或同步失败

依次检查：

1. `https://你的域名/api/weread` 是否也经过同一个反向代理。
2. HTTPS 是否生效。
3. Node 项目日志中是否出现上游超时或 DNS 错误。
4. 服务器是否能出站访问 `https://i.weread.qq.com/`。
5. API Key 是否仍然有效。

### PM2 显示运行，但端口没有监听

检查 Node 项目日志中的启动命令、Node 版本和项目路径。宝塔管理的 PM2 环境可能与终端中的全局 `pm2` 不同，优先使用宝塔 Node 项目页面查看状态和重启。

## 参考资料

- [宝塔面板 Next.js 项目部署教程](https://docs.bt.cn/practical-tutorials/nextjs-deployment)
- [宝塔面板反向代理配置指南](https://docs.bt.cn/user-guide/site/php/site-config/reverse-proxy)
- [vinext 官方文档](https://github.com/cloudflare/vinext)
