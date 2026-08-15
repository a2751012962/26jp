# vendor —— 第三方库（未改动，直接取自 npm dist）

由 `scripts/copy-vendor.mjs` 从 `package.json` 钉死的版本生成（`npm run vendor`），
Vercel 构建时也会重新生成一次，所以**不要手工改这里的文件** —— 改了也会在
下一次部署时被脚本覆盖。升级：改 `package.json` 版本号 → `npm install &&
npm run vendor` → 连同本目录的变化一起提交。

| 文件 | 包 | 版本 | 许可 |
| --- | --- | --- | --- |
| `egjs-grid.min.js` | [@egjs/grid](https://github.com/naver/egjs-grid) | 1.18.0 | MIT |
| `photoswipe.esm.min.js` / `photoswipe-lightbox.esm.min.js` / `photoswipe.css` | [photoswipe](https://github.com/dimsemenov/PhotoSwipe) | 5.4.4 | MIT |
| `supabase.min.js` | [@supabase/supabase-js](https://github.com/supabase/supabase-js) | 2.112.3 | MIT |

只有 `photos.html` 用到这些；行程页 `index.html` 保持零依赖、可离线打开。
