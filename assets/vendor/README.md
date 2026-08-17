# vendor —— 第三方库（未改动，直接取自 npm dist）

由 `scripts/copy-vendor.mjs` 从 `package.json` 钉死的版本生成（`npm run vendor`），
Vercel 构建时也会重新生成一次，所以**不要手工改这里的文件** —— 改了也会在
下一次部署时被脚本覆盖。升级：改 `package.json` 版本号 → `npm install &&
npm run vendor` → 连同本目录的变化一起提交。

| 文件 | 包 | 版本 | 许可 |
| --- | --- | --- | --- |
| `photoswipe.esm.min.js` / `photoswipe-lightbox.esm.min.js` / `photoswipe.css` | [photoswipe](https://github.com/dimsemenov/PhotoSwipe) | 5.4.4 | MIT |
| `supabase.min.js` | [@supabase/supabase-js](https://github.com/supabase/supabase-js) | 2.112.3 | MIT |

瀑布流不用库：每张图的宽高存在数据库里，布局是纯数学（assets/wall.js）。
之前用过 @egjs/grid，它按"先渲染再测量"工作，手机上会拿套用列宽之前的
高度定位，版面出大块空洞，已移除。

只有 `photos.html` 用到这些；行程页 `index.html` 保持零依赖、可离线打开。
