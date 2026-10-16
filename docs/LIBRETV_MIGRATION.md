---
document_type: migration-record
as_of: 2026-10-16
project: TintinTV
upstream: https://github.com/LibreSpark/LibreTV
upstream_commit: a24ad336a3f7c8a16ca93d1f1198e08ac6b7e943
strategy: media-core-integration
data_migration_required: false
---

# LibreTV 媒体核心迁移

## 1. 范围与兼容性

- 点播搜索响应、详情、播放线路和 M3U 直播列表使用 LibreTV 解析模块。
- 上游请求复用 LibreTV 安全请求实现；本地补充保留 IP 段校验、带签名 URL 的完整保留、旧 TypeScript 兼容。
- TintinTV 保留 Next.js 14 / React 18 外壳、Apple TV 风格 UI、登录权限、Upstash、收藏、继续观看、豆瓣缓存与 TMDB 背景图。
- 此次是媒体核心迁移，不是把整个应用替换为 LibreTV 上游的 Next.js 15 / React 19 应用。LibreTV 的本机 IndexedDB 账号替代方案不适用于 TintinTV 的多用户跨设备数据。
- 原 `source + id` 数据键不变，无需清空、导出或迁移账号和观看数据。
- 登录要求不变；“所有用户可直接观看”指已登录用户共享默认源，无需个人配置。

## 2. 点播

```text
/api/search -> getAvailableApiSites
  -> 原 config.json + Upstash 管理员配置 + 可选 DEFAULT_SOURCES
  -> LibreTV 安全请求与 CMS parser
  -> TintinTV SearchResult 适配层
  -> 现有搜索和播放页面

/api/detail -> 优先取 CMS JSON 可播放线路
  -> JSON 不可用/没有剧集时，才尝试已配置的 HTML 详情地址
```

- 既有 20 个点播源继续默认加载；管理员的停用状态继续生效。
- 每源搜索总时限 10 秒；单次请求 8 秒；最多 5 页；分页失败保留成功页。
- 同源同关键词有 60 秒进程内短缓存；去重并使用 LibreTV 的相关性过滤。
- `DEFAULT_SOURCES` 格式与 LibreTV 一致：`[{"name":"名称","url":"https://.../api.php/provide/vod","detail":"https://..."}]`。
- 环境变量新增源使用稳定 URL 派生 ID；不重命名已有视频源。

## 3. 直播

| 项目      | 实现                                                                |
| --------- | ------------------------------------------------------------------- |
| 页面      | `/live`；所有尺寸共用现有导航、Logo 和主题                          |
| 预置精选  | CGTN、CGTN Documentary、CCTV+、DW English                           |
| 地区列表  | IPTV-org 中国大陆、香港、台湾公开 M3U 列表                          |
| 配置入口  | `/admin` 的直播源区域；owner/admin 可添加、停用、启用、删除自定义源 |
| 用户操作  | 选择源、分类、搜索频道、点击播放、失败重试                          |
| 主要格式  | HLS/M3U8；本次不接入 HTTP-FLV 长连接、UDP、RTSP、DRM 或 EPG         |
| 播放策略  | HTTPS 直连优先；HTTP 或直连失败时使用签名代理                       |
| 手机布局  | 播放器左右贴边、频道列表在下方                                      |
| 桌面/iPad | 左侧播放器、右侧可滚动频道列表                                      |

```text
已登录用户 -> /api/live/sources -> 服务端合并默认与管理员源
  -> /api/live/playlist?source=源ID
  -> 24h 共享缓存 / 服务端拉取并解析 M3U
  -> 用户选择频道
  -> /api/live/play?source=源ID&id=频道ID
  -> 验证频道属于启用源，返回直连与签名代理地址
  -> 原生 Safari HLS 或 Hls.js 播放
```

频道列表可在 `src/lib/media-sources.ts` 维护。可选 `DEFAULT_LIVE_SOURCES` 使用 LibreTV 的 `[{"name":"名称","url":"https://.../list.m3u"}]` 格式。生产默认值已随代码部署，不要求新增环境变量。

第三方源的列表可用不等于每个频道可播。地域限制、上游停播、编码兼容与跨域策略仍可能造成单频道失败。界面提供重试和其他频道选择，不宣称所有频道持续在线。

## 4. 成本与访问边界

```yaml
live_cache:
  storage: existing Upstash
  namespace: live:playlist:v1:<sha256(source_id_and_url)>
  fresh_hours: 24
  retention_days: 7
  memory_cache_minutes: 10
  stale_on_error: true
  max_sources: 20
  max_channels_per_source: 250
  max_playlist_bytes: 2097152
  request_timeout_seconds: 12
  refresh_concurrency: 2
  cron: existing /api/cron, daily at 01:00 UTC
  no_redis_fallback: memory cache only; cold instances may refetch

stream_proxy:
  authentication: existing login middleware
  authorization: server-signed target URL; arbitrary unsigned URLs rejected
  signature_lifetime_hours: 6
  secret: PROXY_SECRET or existing PASSWORD
  redirects: validate every redirect with LibreTV public-network checks
  body_timeout_seconds: 15
  max_segment_bytes: 33554432
  manifest_rewrite: variants, segments, keys, subtitles
  traffic: client direct first; proxy only on fallback

pwa:
  media_cache: network-only
  reason: prevent frozen live manifests and unbounded offline segment storage
```

## 5. 部署和许可

- GitHub: https://github.com/0xpixer/TintinTV
- Production: https://www.tintintv.app
- Vercel: https://vercel.com/noclue-labs-projects/tintintv
- 保留现有 `PASSWORD`、`USERNAME`、Upstash 与 TMDB 配置；不写入新的账户凭据。
- 搜索、详情、Cron、直播路由使用 Node runtime，以支持 DNS 校验。
- 引入 LibreTV AGPL 模块，组合项目使用 AGPL-3.0；原 MIT 许可与版权保留在 `LICENSE-MIT`。上游版本记录见 `vendor/libretv/README.md`。
- 账户菜单和直播页提供源代码链接。

## 6. 验证记录

- CMS/M3U 解析、旧 ID 兼容、签名 URL、SSRF、PWA 缓存与已有测试套件。
- 本地真实点播搜索返回 10 个源、49 条带播放地址结果；未逐条播放全部结果。
- 本地 DW English 实际视频解码并推进播放时间；代理主列表、子列表和视频分片均返回 200。
- 未签名的代理请求返回 403。
- 本地中国大陆列表 147 条、香港列表 18 条；数量随上游变化。
- 桌面 1440、iPad 尺寸 834、手机尺寸 390 像素检查无横向溢出，手机播放器左右边距为 0。
- 尺寸检查采用 Chromium，不等同于真实 iPad/iPhone Safari 设备验证。

## 7. 后续维护

- 更新上游时只合并需要的媒体模块，保留 TintinTV 数据契约与 UI。
- 先在测试源上验证带签名 URL、旧收藏 ID、分页失败、源停用、签名代理拒绝与相对地址重写。
- 不把 `src/lib/libretv/types.ts` 的上游类型误当成 TintinTV 账号或 Redis 数据模型。
- 本次没有修复项目既有的明文密码存储、旧 Android TV 域名或通用图片代理问题。
