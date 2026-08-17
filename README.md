# 包车行程卡 · 8/17–8/25

司机版每日行程卡。9 张卡片横向滑动，顶部日期条跟随，点地点名即复制。
纯静态页面，无构建步骤 —— 双击 `index.html` 就能离线打开，也可以直接部署到 Vercel。

## 功能

- **横向滑动卡片** —— 一天一张，scroll-snap 对齐；左右箭头或点日期条都能跳转。
- **日期条自动跟随** —— 选中的日期会自动滚到可见位置，8/25 不会藏在屏幕外。
- **记住上次看的那一天** —— 存在 `localStorage`（键名 `trip-card-idx-0817`），下次打开直接回到那张卡。
- **点击复制地点名** —— 地点名后有复制图标，点一下复制，底部弹出「已复制地点名」。
- **一套刻度管字号也管间距** —— 每张卡片只有一个基准字号 `clamp(12px, 2.2vw, 24px)`，卡内**所有**尺寸都是它的倍数：字号（正文 1em、时间/地点 1.33em、标题 2.4em）、行距、内边距、列宽、区块间距全部用 em。
  以前字号走 `2.2vw`、间距各自走 `1.8vw / 2vw / 4vw`，斜率不同，手机上就会"这里松那里紧"；现在只有一个斜率，390px 和 1440px 下每个比值完全相同。
- **示例照片** —— 有照片的地点，名字后面会出现相机图标，点开是这个地点的瀑布流照片墙（构图参考）。地点名本身照旧点一下即复制。

## 示例照片

给某个地点存几张构图参考，到现场照着拍。

- **看**：地点名后的相机图标 → `photos.html?spot=<slug>`。谁都能看，把链接发给司机或同行的人就行。
  相机图标只在该地点**已有照片**时出现，卡片保持干净。
- **传（不需要登录）**：照片页右上角「上传照片」直接选图；`upload.html` 是专门的
  批量上传页 —— 选地点（按天分组）→ 多选或拖拽 → 3 张并行上传，每张一行进度，
  可选原图直传。给还没照片的地点传第一张：直接开 `upload.html` 选地点，
  或用 `index.html?edit=1` 让所有地点显示相机入口。
- **删**：点「管理」，每张图右上角出现 ×。
- **权限**：读和写都对拿到链接的人开放（应用户要求免登录；RLS 策略已放开）。
  链接只私下分享给司机和同行的人；以后想收紧，把 Supabase 各策略里的
  `anon` 去掉即可（迁移 `open_photo_writes_to_everyone` 记录了改动）。
- 上传前浏览器把照片压到最长边 4096px / JPEG q0.92（原图 10MB+ → 约 1‒2MB，构图细节都在），
  并读出宽高存进数据库，这样照片墙在加载时不会跳动。上传页里也可选**原图直传**
  （JPEG/PNG/WebP 不重新编码；HEIC 仍会转成 JPEG，否则安卓/电脑上显示不了）。
- 每张照片同时生成一张 **720px 宽 / q0.8 的缩略图**（约 70‒150KB）：瀑布流网格加载
  缩略图，点开全屏才取大图 —— 4G 下首屏 <1MB，秒级出图。720 = 列宽上限 340 CSS px
  × 2x 屏 680 物理像素再留余量；两个文件同名（`.t.jpg` 后缀区分），删除时一起清。
- 照片墙布局自算（`assets/wall.js`）：每张图的宽高在数据库里，列数 = 容器宽 ÷ 340 向上取整，
  每张图放进当前最短的列 —— 纯数学、零测量，图片加载前后版面完全不动；间隙随容器宽度
  6‒16px 动态取值，转屏即时重排（ResizeObserver）。点开是
  [PhotoSwipe](https://github.com/dimsemenov/PhotoSwipe) 全屏，可捏合缩放。
  （曾用 @egjs/grid：它"先渲染再测量"，手机上按套用列宽前的高度定位，版面出大块空洞，已移除。）
- 后端是 Supabase（项目 `26jp-trip-photos`，东京区）。权限策略见上面「权限」一条：
  读写都对拿到链接的人开放。`assets/config.js` 里的 publishable key 本来就是给浏览器用的，
  可以公开提交；service_role key 绝对不要放进去。

## 颜色约定

| 颜色 | 含义 |
| --- | --- |
| 蓝（主色） | 出发时间 |
| 红 | 已预约·不能迟到（这类提示在精简版里也会保留） |
| 灰底「如果」 | 备用方案 |
| 浅红「⚠」 | 警示 |

## 网址参数

默认视图就是设计稿的样子。需要临时换个样式时，在网址后面加参数：

| 参数 | 取值 | 作用 |
| --- | --- | --- |
| `accent` | `blue`（默认）· `green` · `rust` | 主色：海蓝 / 墨绿 / 赤茶 |
| `density` | `normal`（默认）· `loose` · `tight` | 行距：标准 / 宽松 / 紧凑 |
| `brief` | `1` | 精简版：隐藏灰色备注与「如果」备用方案，只留时间＋地点 |
| `day` | `8/20` 或 `4` | 直接打开某一天（优先于「记住上次」） |
| `edit` | `1` | 摄影师模式：所有地点显示相机入口（用于上传第一张照片） |

例：`index.html?brief=1&density=tight&day=8/22`

## 改行程内容

行程文字全在 `assets/data.js` 里，改完刷新即可，不需要动 HTML/CSS。
每一天是一个对象，`blocks` 按顺序渲染：

```js
{ t: 'row', time: '09:00 出发', kind: 'go', place: '翠雲（強羅）',
  note: '先上山，下午再下山看美术馆', dur: '▶ 10分' }
```

- `kind: 'go'` → 出发时间，显示主色；`kind: 'fixed'` → 已预约，显示红色
- `noteWarn: true` → 备注用红色，且精简版也不隐藏
- 其余块：`fallback`（如果）、`plan`（并列方案 A/B）、`warn`（⚠）、`legend`、`lodging`

## 文件

```
index.html          行程卡（零依赖，双击就能离线打开）
photos.html         某个地点的示例照片墙
upload.html         批量上传页（选地点 → 多选/拖拽 → 并行上传）
assets/
  style.css         行程卡样式（统一 em 刻度）
  photos.css        照片页 + 上传页样式
  data.js           行程内容 ← 改这里
  app.js            行程卡渲染与交互
  photo-core.js     照片功能共用：Supabase 客户端/压缩/清单/地点清单
  photos.js         照片页：加载／瀑布流／全屏／上传／删除
  upload.js         上传页：队列／并行／原图直传
  config.js         Supabase 连接信息
  vendor/           @egjs/grid、PhotoSwipe、supabase-js（由 scripts/copy-vendor.mjs 生成）
scripts/            Vercel 构建脚本（取 vendor、组装 public/）
package.json        钉死三个前端库的版本；npm run build 出 public/
project/            Claude Design 交付的设计稿原件与 9 张导出图片
chats/              设计过程的对话记录
```

改行程里某个地点的 `spot` slug 就等于换了一套照片；两处 slug 相同的地点（如 8/17 和 8/18 的七里ヶ浜、8/20 和 8/21 的稲取荘）共用同一批照片，这是故意的。

## 部署

Vercel 导入仓库后用默认设置即可：构建命令走 `npm run build`
（`scripts/copy-vendor.mjs` 按 `package.json` 钉死的版本重取 vendor，
`scripts/build-public.mjs` 把 `index.html`、`photos.html`、`assets/`
组装进 `public/` 输出目录）。`project/`、`chats/` 等工作文件**不会**上线。

本地开发不需要构建 —— 双击 `index.html` 就能打开行程卡（照片功能需要
起个本地服务器，例如 `npm start`）。

⚠ 不要在 Vercel 后台清掉 Build Command：`public/` 不在 git 里，
没有构建就没有产物，部署会报 `No Output Directory named "public"`。
