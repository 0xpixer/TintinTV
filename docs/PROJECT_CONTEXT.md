---
document_type: project-context
schema_version: 1
project: TintinTV
language: zh-CN
as_of: 2026-10-10
code_baseline:
  branch: main
  commit: 7ab05b35a0edfcfb35206c1db4b4c63ce3cc3957
production_status: ready
secrets_included: false
canonical_for:
  - current architecture
  - runtime flows
  - role permissions
  - integrations
  - deployment endpoints
  - operational constraints
---

# TintinTV 项目上下文

> 本文使用稳定 ID、状态字段、表格和显式约束，供开发者与 AI 在后续任务中快速建立上下文。事实以 `2026-10-10` 的 `main@7ab05b3`、生产接口和 Vercel 配置为准。文档不包含密码、Token、Cookie、数据库内容或其他密钥值。

## 0. AI 使用规则

```yaml
rules:
  - id: AI-001
    statement: TintinTV 是当前产品名；不要恢复 MoonTV 品牌、仓库名、Logo 或文案。
  - id: AI-002
    statement: 当前产品定位为私人家庭使用；商业化、付费墙、试看和支付逻辑已撤回。
  - id: AI-003
    statement: 当前生产站点必须登录后才能访问内容页。
  - id: AI-004
    statement: 不在文档、Issue、日志或提交中写入任何凭据值；只记录变量名和用途。
  - id: AI-005
    statement: 第三方视频源可能随时失效；任何功能都要保留超时、空状态、换源和失败恢复。
  - id: AI-006
    statement: Apple TV 仅是视觉与信息层级参考，不使用 Apple 商标或宣称关联。
  - id: AI-007
    statement: 默认在完成代码修改后运行相关测试、生产构建、推送 main，并确认 Vercel 状态。
  - id: AI-008
    statement: 生产当前使用 Upstash；不要把可选的 localStorage、Redis 或 D1 支持误写成当前生产状态。
```

## 1. 项目事实

```yaml
project:
  name: TintinTV
  purpose: 私人使用的影视聚合浏览与播放界面
  content_model: 展示元数据并聚合第三方视频播放地址；本站不托管视频文件
  primary_language: 中文
  primary_platform: Web/PWA
  optional_platforms:
    - Docker
    - Android TV WebView shell
  commercial_status: disabled
  access_mode: login_required

source_control:
  local_path: /Users/lj/projects/MoonTV
  branch: main
  github_repository: https://github.com/0xpixer/TintinTV
  git_remote: https://github.com/0xpixer/TintinTV.git

production:
  hosting: Vercel
  team: noclue-labs-projects
  project_name: tintintv
  project_id: prj_nUPXMjn14nSJWF36usucoSTt0ChP
  project_dashboard: https://vercel.com/noclue-labs-projects/tintintv
  primary_url: https://www.tintintv.app
  aliases:
    - https://tintintv.app
    - https://tintintv.vercel.app
    - https://tintintv-noclue-labs-projects.vercel.app
    - https://tintintv-git-main-noclue-labs-projects.vercel.app
  deployment_id: dpl_7HNWqArX5b6D1EAHiAuqfsdoWr2Z
  deployment_url: https://tintintv-os7wuouut-noclue-labs-projects.vercel.app
  deployment_status: Ready
  production_storage: upstash

local_development:
  default_url: http://localhost:3000
  package_manager: pnpm@10.12.4
  node_target: Node.js 20
```

## 2. 产品边界

### 2.1 当前保留

- 登录后浏览首页、电影、剧集、综艺和“Anna 动画屋”。
- 从豆瓣获取分类、海报、评分与基础内容列表。
- 从 TMDB 获取首页 Hero 横版背景图和中文简介。
- 同时搜索多个第三方苹果 CMS V10 视频源。
- 播放 HLS/M3U8，支持选集、换源、源测速与自动优选。
- 收藏、播放进度、继续观看和搜索历史跨设备同步。
- `owner` / `admin` 管理用户、站点配置和视频源。
- PWA、iOS Safari 沉浸式布局和响应式桌面/平板/手机体验。
- Android TV WebView 壳代码与 APK 构建链路。

### 2.2 当前明确不包含

- 不包含会员、订阅、试看时长、付费墙或支付平台。
- 不存储或分发自有视频文件。
- 不保证任何第三方视频源、豆瓣或 TMDB 的持续可用性。
- Android TV 自动登录目前未在生产环境启用，详见 `INT-TV-001`。

## 3. 技术架构

| 层        | 当前实现                                            | 关键文件                                            |
| --------- | --------------------------------------------------- | --------------------------------------------------- |
| Web 框架  | Next.js 14 App Router、React 18、TypeScript         | `src/app/**`                                        |
| UI        | Tailwind CSS、Apple TV 启发的内容优先设计、深浅主题 | `src/app/globals.css`、`DESIGN.md`                  |
| 导航布局  | 统一桌面导航、移动端居中 Logo + Hamburger           | `PageLayout.tsx`、`MobileHeader.tsx`、`Sidebar.tsx` |
| 分类数据  | 豆瓣分类 API + 备用查询 + Redis 缓存                | `douban*.ts`、`/api/douban/**`                      |
| Hero 媒体 | TMDB Search API + Vercel CDN 缓存                   | `/api/tmdb/backdrop`                                |
| 视频搜索  | 20 个苹果 CMS V10 接口并行搜索                      | `/api/search`、`downstream.ts`                      |
| 播放      | 原生 HLS 或 Hls.js，M3U8 广告片段过滤               | `src/app/play/page.tsx`                             |
| 用户数据  | 生产为 Upstash Redis；浏览器有一小时读缓存          | `upstash.db.ts`、`db.client.ts`                     |
| 身份验证  | 365 天签名 Cookie + Next.js Middleware              | `auth.ts`、`middleware.ts`、`/api/login`            |
| PWA       | 自定义 Service Worker、Manifest、iOS Meta           | `public/sw.js`、`public/manifest.json`、`pwa.ts`    |
| 部署      | GitHub → Vercel 自动生产部署                        | `.vercel/project.json`、`vercel.json`               |
| 容器      | Next.js standalone Docker 镜像                      | `Dockerfile`、`start.js`                            |
| TV        | Android WebView 壳，Token 换取 Web Cookie           | `android-tv/**`、`/api/tv-auth`                     |

### 3.1 构建流程

```text
pnpm build
  -> scripts/convert-config.js
     -> config.json 转为 src/lib/runtime.ts
  -> scripts/generate-manifest.js
     -> 根据 SITE_NAME 生成 public/manifest.json
  -> next build
  -> standalone output
```

`src/lib/runtime.ts` 是生成文件。资源站的静态来源是 `config.json`，不要直接编辑生成文件。

## 4. 页面地图

| 页面        | 路径                 | 作用                                 | 认证        |
| ----------- | -------------------- | ------------------------------------ | ----------- |
| 登录        | `/login`             | 用户名/密码登录；按配置显示注册入口  | 否          |
| 首页        | `/`                  | Hero、热门电影/剧集/综艺、继续观看   | 是          |
| 电影        | `/douban?type=movie` | 分类与地区筛选、无限滚动             | 是          |
| 剧集        | `/douban?type=tv`    | 国产、欧美、日本、韩国、动漫、纪录片 | 是          |
| 综艺        | `/douban?type=show`  | 全部、国内、国外                     | 是          |
| Anna 动画屋 | `/animation`         | 动画电影/动画剧集切换                | 是          |
| 搜索        | `/search`            | 聚合搜索所有启用视频源               | 是          |
| 播放        | `/play`              | 播放、选集、换源、收藏、推荐         | 是          |
| 收藏        | `/favorites`         | 当前用户收藏                         | 是          |
| 管理        | `/admin`             | 用户、站点、视频源配置               | owner/admin |

## 5. 核心运行逻辑

### FLOW-AUTH-001：普通登录

```text
浏览器访问受保护页面
  -> middleware 读取 auth Cookie
  -> 无 Cookie / 签名无效
     -> 页面请求重定向 /login?redirect=原路径
     -> API 请求返回 401
  -> POST /api/login
     -> owner: 校验 USERNAME + PASSWORD 环境变量
     -> 其他用户: Upstash u:{username}:pwd
     -> 读取角色与 banned 状态
     -> 生成 HMAC-SHA256(username, PASSWORD) 签名
     -> 写入有效期 365 天的 auth Cookie
  -> 返回原页面
```

Cookie 属性：`SameSite=Lax`、HTTPS 下 `Secure=true`、`HttpOnly=false`。时间戳会写入 Cookie，但 Middleware 当前不校验时间戳；实际有效期由 Cookie 到期时间决定。

### FLOW-HOME-001：首页

```text
首页挂载
  -> 优先读取 localStorage: tintintv_home_categories_v1（最多 7 天）
  -> 并行请求热门电影、热门剧集、热门综艺
  -> /api/douban/categories 优先读取 Upstash 分类缓存
  -> 选择 Hero 条目
  -> /api/tmdb/backdrop 按标题/年份查找 w1280 背景与中文简介
  -> 继续观看读取 /api/playrecords，并在浏览器缓存 1 小时
```

### FLOW-CATEGORY-001：分类浏览

```text
用户选择分类
  -> 浏览器检查该组合的 7 天 localStorage 缓存
  -> GET /api/douban/categories
  -> Upstash fresh cache 命中: 立即返回
  -> 未命中: 请求豆瓣 recent_hot
  -> 主接口失败: 使用 j/search_subjects 标签映射兜底
  -> 写 Upstash + 返回浏览器
  -> 滚动到底部后按 25 条继续请求
```

服务端分类缓存：新鲜期 `26 小时`，Redis TTL `30 天`。旧缓存会在外部请求失败时继续兜底。

### FLOW-SEARCH-001：视频搜索

```text
用户提交关键词
  -> GET /api/search?q=...
  -> 读取启用的视频源
  -> 对全部启用源并行调用苹果 CMS videolist API
  -> 每个源最多读取配置的页数，单页请求有超时
  -> 清洗标题、年份、简介、剧集与 M3U8 地址
  -> 合并并按标题匹配度排序
  -> 保存当前用户搜索历史（最多 20 条）
```

### FLOW-PLAY-001：播放与换源

```text
从海报或搜索结果进入 /play
  -> 优先使用 URL 中携带的搜索结果交接数据
  -> 缺失时按 title/q 再搜索候选源
  -> GET /api/detail?source=...&id=...
  -> 解析苹果 CMS 详情或特殊源 HTML
  -> 候选源按清晰度 40% + 速度 40% + Ping 20% 排序
  -> 选择源和集数
  -> Safari/原生支持时直接播放 HLS
  -> 其他浏览器使用 Hls.js
  -> 定期写入播放进度
  -> 播放完成后自动尝试下一集
```

播放页面的推荐内容根据 `movie`、`tv`、`show`、`animation-movie`、`animation-series` 分类调用豆瓣列表。

### FLOW-DATA-001：收藏、历史与继续观看

```text
客户端操作
  -> 立即更新 UI/浏览器缓存
  -> Upstash 模式调用 /api/favorites、/api/playrecords、/api/searchhistory
  -> 服务端从 auth Cookie 获取 username
  -> 数据写入 u:{username}:* 命名空间
  -> 其他设备登录同一账号后读取同一份数据
```

## 6. 身份、角色与权限

### 6.1 身份类型

| ID              | 身份          | 来源                             | 说明                                   |
| --------------- | ------------- | -------------------------------- | -------------------------------------- |
| `IDENTITY-ANON` | 未登录访客    | 无 Cookie                        | 只能访问登录和少数公共 API             |
| `ROLE-USER`     | 普通用户      | Upstash 账号                     | 浏览、播放、收藏、记录、修改自己的密码 |
| `ROLE-ADMIN`    | 管理员        | `admin:config`                   | 普通用户能力 + 管理站点/源/普通用户    |
| `ROLE-OWNER`    | 站长          | `USERNAME` / `PASSWORD` 环境变量 | 最高权限；角色由环境变量强制确定       |
| `IDENTITY-TV`   | TV 客户端用户 | `TV_ACCESS_TOKEN` 换 Cookie      | 设计为免手输账号；当前生产未启用       |

### 6.2 权限矩阵

| 能力                         | 匿名 | user | admin |             owner              |
| ---------------------------- | :--: | :--: | :---: | :----------------------------: |
| 查看内容与播放               |  否  |  是  |  是   |               是               |
| 收藏、播放记录、搜索历史     |  否  |  是  |  是   |               是               |
| 修改自己的数据库密码         |  否  |  是  |  是   | 不适用；修改 Vercel `PASSWORD` |
| 进入 `/admin`                |  否  |  否  |  是   |               是               |
| 修改站点设置                 |  否  |  否  |  是   |               是               |
| 添加、启用、停用、排序视频源 |  否  |  否  |  是   |               是               |
| 删除静态 `config.json` 来源  |  否  |  否  |  否   |               否               |
| 添加普通用户                 |  否  |  否  |  是   |               是               |
| 封禁/解封普通用户            |  否  |  否  |  是   |               是               |
| 删除普通用户及其数据         |  否  |  否  |  是   |               是               |
| 修改普通用户密码             |  否  |  否  |  是   |               是               |
| 设置/取消管理员              |  否  |  否  |  否   |               是               |
| 操作其他管理员               |  否  |  否  |  否   |               是               |
| 操作 owner                   |  否  |  否  |  否   |    不能删除或通过 UI 改密码    |
| 重置全部管理配置             |  否  |  否  |  否   |               是               |
| 开关开放注册                 |  否  |  否  |  是   |               是               |

### 6.3 公共路由边界

无需普通登录即可访问：

- `/login`
- `/api/login`
- `/api/register`，但仍受 `AllowRegister` 控制
- `/api/logout`
- `/api/tv-auth`，但要求 TV Token
- `/api/cron`，但要求 `Authorization: Bearer CRON_SECRET`
- `/api/server-config`，只返回站点名与存储类型
- Next.js 静态资源、Manifest、图标

其他页面与 API 默认由 Middleware 保护。

## 7. 数据模型与存储

生产使用 Upstash Redis。代码仍支持 `localstorage`、原生 `redis` 和 Cloudflare `d1`，但它们不是当前生产配置。

| 数据         | Redis Key                         | 内容                                   |
| ------------ | --------------------------------- | -------------------------------------- |
| 用户密码     | `u:{username}:pwd`                | 当前为明文字符串                       |
| 播放记录     | `u:{username}:pr:{source}+{id}`   | 标题、封面、集数、进度、时长、保存时间 |
| 收藏         | `u:{username}:fav:{source}+{id}`  | 标题、封面、总集数、来源、保存时间     |
| 搜索历史     | `u:{username}:sh`                 | Redis List，最多 20 条                 |
| 管理配置     | `admin:config`                    | 站点设置、角色、封禁、源设置           |
| 豆瓣分类缓存 | `douban:category:{encoded-query}` | 分类结果、保存时间；TTL 30 天          |

浏览器缓存：

- 首页豆瓣分区：7 天，同时后台刷新。
- 分类页/动画页：每个筛选组合 7 天，同时后台刷新。
- 用户播放记录、收藏和历史：1 小时混合缓存。
- 页面/静态资源：由自定义 Service Worker 管理；所有 `/api/*` 均为 `network-only`。
- 豆瓣/TMDB 图片：Vercel CDN 长缓存；允许 `*.doubanio.com` 和 `image.tmdb.org`。

## 8. API 地图

| API                      | 方法            | 功能                       | 认证                    |
| ------------------------ | --------------- | -------------------------- | ----------------------- |
| `/api/login`             | POST            | 登录并设置 Cookie          | 公共                    |
| `/api/logout`            | POST            | 清除 Cookie                | 公共                    |
| `/api/register`          | POST            | 注册普通用户               | 公共 + 注册开关         |
| `/api/change-password`   | POST            | 当前用户改密码             | 登录                    |
| `/api/server-config`     | GET             | 返回站点名、存储类型       | 公共                    |
| `/api/search`            | GET             | 搜索所有启用源             | 登录                    |
| `/api/search/one`        | GET             | 搜索单个指定源             | 登录                    |
| `/api/search/resources`  | GET             | 获取启用源清单             | 登录                    |
| `/api/detail`            | GET             | 获取某源某 ID 的详情和剧集 | 登录                    |
| `/api/douban`            | GET             | 豆瓣标签/Top250 列表       | 登录                    |
| `/api/douban/categories` | GET             | 电影/剧集/综艺分类列表     | 登录                    |
| `/api/tmdb/backdrop`     | GET             | Hero 横图和简介            | 登录                    |
| `/api/image-cache`       | GET             | 白名单图片代理与 CDN 缓存  | 登录                    |
| `/api/image-proxy`       | GET             | OrionTV 兼容图片代理       | 登录                    |
| `/api/favorites`         | GET/POST/DELETE | 收藏 CRUD                  | 登录                    |
| `/api/playrecords`       | GET/POST/DELETE | 播放记录 CRUD              | 登录                    |
| `/api/searchhistory`     | GET/POST/DELETE | 搜索历史 CRUD              | 登录                    |
| `/api/admin/config`      | GET             | 获取管理配置和角色         | admin/owner             |
| `/api/admin/site`        | POST            | 更新站点配置               | admin/owner             |
| `/api/admin/source`      | POST            | 管理视频源                 | admin/owner             |
| `/api/admin/user`        | POST            | 管理用户/角色/注册         | admin/owner，按动作细分 |
| `/api/admin/reset`       | GET             | 重置管理配置               | owner                   |
| `/api/cron`              | GET             | 每日预热和记录维护         | `CRON_SECRET`           |
| `/api/tv-auth`           | POST            | TV Token 换登录 Cookie     | `TV_ACCESS_TOKEN`       |

## 9. 第三方连接

### 9.1 当前生产连接

| ID                | 服务                      | 状态              | 用途                                | 凭据/配置                              |
| ----------------- | ------------------------- | ----------------- | ----------------------------------- | -------------------------------------- |
| `INT-GITHUB-001`  | GitHub                    | active            | 源码、Actions、Docker 构建          | 仓库权限 / `GITHUB_TOKEN`              |
| `INT-VERCEL-001`  | Vercel                    | active            | Web 托管、Edge Functions、CDN、Cron | Git 集成、Vercel Project               |
| `INT-UPSTASH-001` | Upstash Redis             | active            | 用户数据、配置、豆瓣缓存            | `KV_REST_API_URL`、`KV_REST_API_TOKEN` |
| `INT-TMDB-001`    | TMDB API                  | active            | Hero 横版背景和中文简介             | `TMDB_API_READ_ACCESS_TOKEN`           |
| `INT-DOUBAN-001`  | 豆瓣                      | active_unofficial | 分类、海报、评分、Top250            | 无官方 Token；服务端请求 + 缓存        |
| `INT-CMS-001`     | 苹果 CMS 视频源           | active_unofficial | 搜索、详情、M3U8 地址               | `config.json` + `admin:config`         |
| `INT-GHCR-001`    | GitHub Container Registry | active_pipeline   | 多架构 Docker 镜像                  | `ghcr.io/0xpixer/tintintv`             |

TMDB 声明：`This product uses the TMDB API but is not endorsed or certified by TMDB.`

### 9.2 当前生产环境变量

以下变量在 Vercel Production 中存在；值均为加密值，不应写入仓库：

| 变量                          | 用途                                 |
| ----------------------------- | ------------------------------------ |
| `CRON_SECRET`                 | 验证 Vercel Cron 请求                |
| `TMDB_API_READ_ACCESS_TOKEN`  | TMDB Bearer Token                    |
| `NEXT_PUBLIC_ENABLE_REGISTER` | 注册开关；具体值不在文档中暴露       |
| `NEXT_PUBLIC_STORAGE_TYPE`    | 当前有效值由公共接口确认是 `upstash` |
| `USERNAME`                    | owner 用户名                         |
| `PASSWORD`                    | owner 密码，同时作为登录签名密钥     |
| `REDIS_URL`                   | Marketplace/Redis 兼容连接信息       |
| `KV_REST_API_URL`             | Upstash REST Endpoint                |
| `KV_REST_API_TOKEN`           | Upstash REST Token                   |
| `KV_REST_API_READ_ONLY_TOKEN` | Upstash 只读 Token                   |
| `KV_URL`                      | Marketplace 兼容 URL                 |

代码还识别但生产当前未配置：`TV_ACCESS_TOKEN`、`TV_AUTH_USERNAME`、`TMDB_API_KEY`、`UPSTASH_URL`、`UPSTASH_TOKEN`、`SITE_NAME`、`ANNOUNCEMENT`、`NEXT_PUBLIC_IMAGE_PROXY`、`NEXT_PUBLIC_DOUBAN_PROXY`、`NEXT_PUBLIC_SEARCH_MAX_PAGE`。

### 9.3 视频源清单

静态配置当前包含 20 个来源。管理员可停用、排序，或添加 `from=custom` 的来源；静态来源不可在后台删除。

| Key         | 名称         | API                                              | Detail                       |
| ----------- | ------------ | ------------------------------------------------ | ---------------------------- |
| `dyttzy`    | 电影天堂资源 | `http://caiji.dyttzyapi.com/api.php/provide/vod` | `http://caiji.dyttzyapi.com` |
| `heimuer`   | 黑木耳       | `https://json.heimuer.xyz/api.php/provide/vod`   | `https://heimuer.tv`         |
| `ruyi`      | 如意资源     | `https://cj.rycjapi.com/api.php/provide/vod`     | -                            |
| `bfzy`      | 暴风资源     | `https://bfzyapi.com/api.php/provide/vod`        | -                            |
| `tyyszy`    | 天涯资源     | `https://tyyszy.com/api.php/provide/vod`         | -                            |
| `ffzy`      | 非凡影视     | `http://ffzy5.tv/api.php/provide/vod`            | `http://ffzy5.tv`            |
| `zy360`     | 360 资源     | `https://360zy.com/api.php/provide/vod`          | -                            |
| `maotaizy`  | 茅台资源     | `https://caiji.maotaizy.cc/api.php/provide/vod`  | -                            |
| `wolong`    | 卧龙资源     | `https://wolongzyw.com/api.php/provide/vod`      | -                            |
| `jisu`      | 极速资源     | `https://jszyapi.com/api.php/provide/vod`        | `https://jszyapi.com`        |
| `dbzy`      | 豆瓣资源     | `https://dbzy.tv/api.php/provide/vod`            | -                            |
| `mozhua`    | 魔爪资源     | `https://mozhuazy.com/api.php/provide/vod`       | -                            |
| `mdzy`      | 魔都资源     | `https://www.mdzyapi.com/api.php/provide/vod`    | -                            |
| `zuid`      | 最大资源     | `https://api.zuidapi.com/api.php/provide/vod`    | -                            |
| `yinghua`   | 樱花资源     | `https://m3u8.apiyhzy.com/api.php/provide/vod`   | -                            |
| `wujin`     | 无尽资源     | `https://api.wujinapi.me/api.php/provide/vod`    | -                            |
| `wwzy`      | 旺旺短剧     | `https://wwzy.tv/api.php/provide/vod`            | -                            |
| `ikun`      | iKun 资源    | `https://ikunzyapi.com/api.php/provide/vod`      | -                            |
| `lzi`       | 量子资源站   | `https://cj.lziapi.com/api.php/provide/vod`      | -                            |
| `xiaomaomi` | 小猫咪资源   | `https://zy.xmm.hk/api.php/provide/vod`          | -                            |

### 9.4 支持但当前未作为生产主链路

| 服务/能力                  | 状态                    | 说明                                              |
| -------------------------- | ----------------------- | ------------------------------------------------- |
| Cloudflare Pages           | supported_not_active    | 保留 `pages:build` 和 `@cloudflare/next-on-pages` |
| Cloudflare D1              | supported_not_active    | 有 `D1Storage` 和初始化 SQL 文档                  |
| 原生 Redis                 | supported_not_active    | 适合 Docker 自托管                                |
| Cloudflare 通用代理 Worker | source_only             | `proxy.worker.js` 存在，但没有证据表明当前已部署  |
| 自定义豆瓣/图片代理        | configurable_not_active | 通过后台或环境变量配置，生产变量当前不存在        |

## 10. 缓存与定时任务

### 10.1 Vercel Cron

```yaml
cron:
  path: /api/cron
  schedule_utc: '0 1 * * *'
  schedule_jakarta: '每天 08:00'
  authentication: CRON_SECRET
  max_duration_seconds: 60
```

任务包含：

1. 等待完成豆瓣分类预热。
2. 预热 18 个常用入口，每个首屏最多 25 条，并发上限 2。
3. 尝试刷新每个用户收藏和播放记录中的总集数。

预热范围：4 个电影主分类、4 个电影地区、7 个剧集分类、3 个综艺分类。复合筛选和后续分页按需加载，避免缓存组合爆炸。

### 10.2 CDN 与图片

- 豆瓣分类响应使用 Vercel CDN `s-maxage` 和 `stale-while-revalidate`。
- TMDB 命中结果缓存 24 小时；未命中或错误使用较短缓存。
- 豆瓣/TMDB 图片内存缓存 24 小时，CDN 缓存 30 天，陈旧可继续使用 7 天。
- `/api/image-proxy` 为兼容接口，当前允许任意 URL，CDN 缓存半年。

## 11. 部署与发布

### 11.1 Vercel 主链路

```text
本地 main 提交
  -> git push origin main
  -> GitHub 更新 0xpixer/TintinTV
  -> Vercel Git Integration 自动构建 Production
  -> Ready 后自动更新 tintintv.app / www.tintintv.app aliases
```

常用检查：

```bash
pnpm test -- --runInBand
pnpm typecheck
pnpm build
git push origin main
vercel inspect https://www.tintintv.app
```

### 11.2 Docker/GHCR

`.github/workflows/docker-image.yml` 在 `main` 的非 Markdown 变更后构建 `linux/amd64` 和 `linux/arm64`，合并 manifest 并推送：

```text
ghcr.io/0xpixer/tintintv:latest
```

Docker 会把 Edge route 改为 Node.js runtime，并使用 Next.js standalone 输出。

## 12. Android TV 与 PWA

### PWA

- Manifest：`public/manifest.json`。
- Service Worker：`public/sw.js`。
- API 请求：`network-only`，避免认证数据和动态用户数据被离线缓存。
- 页面导航：`network-first`。
- 图片/静态资源：`cache-first`。
- 主题色：`#101114`，支持 iOS `viewport-fit=cover` 和 `black-translucent`。

### Android TV

Android 项目是横屏沉浸式 WebView 壳：

```text
启动 APK
  -> POST {TINTINTV_URL}/api/tv-auth
  -> x-tintintv-tv-token 校验
  -> 保存 Web auth Cookie
  -> WebView 打开 TintinTV
```

构建命令：`pnpm apk:tv`。输出：`dist/tintintv-tv.apk`。

当前状态：`inactive/broken-until-reconfigured`。

- `android-tv/local.properties` 的非密钥 URL 仍是已废弃的 `https://tintintv.club`。
- Vercel Production 当前没有 `TV_ACCESS_TOKEN` 或 `TV_AUTH_USERNAME`。
- 现有 APK 因此不能作为当前生产入口；恢复前必须改为 `https://www.tintintv.app`，配置 TV Token 并重新构建签名 APK。

## 13. 已知风险与技术债

| ID                 | 严重度   | 当前事实                                                     | 建议                                                        |
| ------------------ | -------- | ------------------------------------------------------------ | ----------------------------------------------------------- |
| `RISK-AUTH-001`    | high     | Upstash 用户密码为明文存储                                   | 迁移为 Argon2/bcrypt/scrypt 哈希；登录兼容旧数据后逐步升级  |
| `RISK-AUTH-002`    | medium   | `auth` Cookie 为 `HttpOnly=false`                            | 将角色展示改由安全 API 提供，再迁移到 HttpOnly Cookie       |
| `RISK-AUTH-003`    | medium   | Cookie timestamp 写入但未校验                                | 增加服务端过期验证和签名版本字段                            |
| `RISK-PROXY-001`   | high     | `/api/image-proxy` 接受任意 URL                              | 添加域名白名单，防止 SSRF/带宽滥用                          |
| `RISK-WORKER-001`  | high     | `proxy.worker.js` 是通用开放代理代码                         | 不应公开部署；若保留需认证、白名单和限流                    |
| `RISK-TV-001`      | medium   | Android URL 仍指向废弃域名，生产缺少 Token                   | 按第 12 节恢复或明确移除 APK 发布物                         |
| `RISK-CRON-001`    | medium   | 收藏/记录刷新使用 `void`，响应后在 Serverless 中不保证执行完 | 改为受时限控制的 awaited 批处理或独立任务                   |
| `RISK-DOCKER-001`  | medium   | `start.js` 调用 `/api/cron` 时未发送 `CRON_SECRET`           | 给请求增加 Authorization Header，并要求 Docker 环境配置密钥 |
| `RISK-META-001`    | low      | OpenGraph URL 仍是废弃的 `tintintv.club`                     | 改为 `https://www.tintintv.app`                             |
| `RISK-CACHE-001`   | low      | 首页/分类浏览器缓存最长 7 天                                 | 保持后台刷新；涉及排序策略变化时升级缓存 key 版本           |
| `RISK-UPSTASH-001` | medium   | `getAll*` 使用 Redis `KEYS` 并逐条读取                       | 用户/记录增长后改为集合索引或 Hash/MGET                     |
| `RISK-SOURCE-001`  | inherent | 20 个非官方视频源可能失效、变慢或返回异常内容                | 保持禁用、换源、超时和内容校验能力                          |
| `RISK-LEGAL-001`   | external | 第三方影视内容权利与服务条款不受本站控制                     | 保持私人使用定位，不恢复商业化前先完成授权审查              |

## 14. 本地开发

```bash
pnpm install
pnpm dev
# http://localhost:3000
```

质量检查：

```bash
pnpm test -- --runInBand
pnpm typecheck
pnpm exec eslint --max-warnings=0 src
pnpm build
```

主要测试文件：

- 豆瓣分类与备用接口：`src/app/api/douban/categories/route.test.ts`
- 豆瓣每日预热：`src/lib/douban-prewarm.test.ts`
- 内容类型识别：`src/lib/content-kind.test.ts`
- 搜索排序与查询：`search-query.test.ts`、`search-results.test.ts`
- 播放页数据交接：`play-handoff.test.ts`
- 视频源排序：`source-ranking.test.ts`
- PWA 缓存与注册：`pwa*.test.ts`

## 15. 关键文件索引

| 领域           | 文件                                                                   |
| -------------- | ---------------------------------------------------------------------- |
| 产品与设计     | `PRODUCT.md`、`DESIGN.md`                                              |
| 项目规则       | `AGENTS.md`、`docs/agents/**`                                          |
| 全局布局与 PWA | `src/app/layout.tsx`、`public/sw.js`                                   |
| 导航           | `PageLayout.tsx`、`MobileHeader.tsx`、`Sidebar.tsx`                    |
| 首页           | `src/app/page.tsx`                                                     |
| 分类           | `src/app/douban/page.tsx`、`DoubanSelector.tsx`                        |
| 动画           | `src/app/animation/page.tsx`                                           |
| 搜索           | `src/app/search/page.tsx`、`/api/search`                               |
| 播放           | `src/app/play/page.tsx`、`EpisodeSelector.tsx`                         |
| 收藏/记录      | `db.client.ts`、`favorites/route.ts`、`playrecords/route.ts`           |
| 登录与角色     | `middleware.ts`、`auth.ts`、`login/route.ts`                           |
| 管理后台       | `src/app/admin/page.tsx`、`src/app/api/admin/**`                       |
| Upstash        | `src/lib/upstash.db.ts`                                                |
| 豆瓣           | `douban.client.ts`、`douban-categories.server.ts`、`douban-prewarm.ts` |
| TMDB           | `src/app/api/tmdb/backdrop/route.ts`                                   |
| 视频源         | `config.json`、`config.ts`、`downstream.ts`                            |
| Vercel         | `.vercel/project.json`、`vercel.json`                                  |
| Docker         | `Dockerfile`、`start.js`                                               |
| Android TV     | `android-tv/**`、`docs/android-tv-apk.md`                              |

## 16. 维护本文

以下变化发生时必须同步更新本文：

- 域名、GitHub 仓库、Vercel 项目或生产存储变化。
- 新增/移除第三方服务、环境变量或视频源。
- 修改登录、Cookie、角色或管理员权限。
- 恢复商业化、支付、注册或匿名访问。
- 修改缓存时长、Cron 频率或预热范围。
- Android TV 恢复上线或被删除。
- 发现并修复第 13 节风险。

更新时只记录密钥名称，不记录密钥值。
