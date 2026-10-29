# 微信读书 Skill 1.0.5 兼容性核对

核对日期：2026-10-30。范围为当前应用使用的 8 个只读接口；仅本地适配，未部署。

契约来源为 [Tencent/WeChatReading 的 SKILL.md](https://github.com/Tencent/WeChatReading/blob/main/skills/SKILL.md) 及同目录的 `book.md`、`shelf.md`、`notes.md`、`readdata.md`。本轮本地安装版本为 1.0.5；这些文档是上游契约，项目不修改或打包它们。

| 接口 | 核对结果 |
| --- | --- |
| `/shelf/sync` | 无业务参数；书籍、有声书和非空文章收藏入口继续参与书库构建；新增保留书籍 `readerLink` |
| `/user/notebooks` | `count`、`lastSort` 平铺；使用最后一项 `sort` 继续分页；笔记数为三类计数之和 |
| `/book/bookmarklist` | `bookId`；`updated` 作为划线内容，书签仅计数 |
| `/review/list/mine` | 小写 `bookid`、`synckey`、`count`；个人想法/点评与划线合并导出 |
| `/book/chapterinfo` | `bookId`；按章节 UID 关联笔记和阅读进度 |
| `/book/info` | `bookId`；详情归一化保留 `readerLink`、`deepLink` |
| `/book/getprogress` | `bookId`；进度仍按 0–100 处理，1 表示 1% |
| `/readdata/detail` | `mode`、`baseTime`；时长按秒，总量采用 `totalReadTime`，时段从 6 点开始 |

适配决策：

- 服务端统一固定 `skill_version=1.0.5`，客户端无法覆盖；接口和参数白名单保持原范围。
- 优先使用上游 `readerLink`，其次 `deepLink`；两者都缺失时不显示打开动作。删除本地 MD5/Reader ID 推导，避免依赖上游未承诺的编码规则。链接从书架合并、书库条目和详情结果传递到打开动作，仅接受微信读书官方 HTTPS 或 App 地址。
- 出现 `upgrade_info` 即拒绝消费该响应，包括空对象、空消息和 null。界面使用固定中文提示联系维护者；连接、书库、详情和同步的部分成功分支不得将升级错误降级为普通缺失数据。网页不会根据上游消息自动下载或执行代码；维护者完成契约更新后再重试。已经发出的并行请求可能完成，但升级响应不会作为正常结果使用。

本地验证：`npm test`（含生产构建）52 项全部通过；`npx tsc --noEmit`、`npm run lint` 和 `git diff --check` 通过。生产构建后的代理测试使用模拟上游响应，核验版本、顶层分页参数、链接原样传递及 no-store；纯函数测试覆盖链接优先级、无链接、不安全地址和升级错误。

验证边界：未使用真实 API Key，未读取真实书架或笔记，未进行已登录网关联调、浏览器跳转或手机 App 唤起验收。测试证明本地实现符合所读取的文档与模拟契约，不代表线上环境已更新。本轮未修改样式或视觉布局，也未执行新的视觉验收。
