# vendor —— 第三方库（未改动，直接取自 npm dist）

手工同步，没有构建步骤。要升级就重新 `npm pack` 再覆盖。

| 文件 | 包 | 版本 | 许可 |
| --- | --- | --- | --- |
| `egjs-grid.min.js` | [@egjs/grid](https://github.com/naver/egjs-grid) | 1.18.0 | MIT |
| `photoswipe.esm.min.js` / `photoswipe-lightbox.esm.min.js` / `photoswipe.css` | [photoswipe](https://github.com/dimsemenov/PhotoSwipe) | 5.4.4 | MIT |
| `supabase.min.js` | [@supabase/supabase-js](https://github.com/supabase/supabase-js) | 2.112.3 | MIT |

只有 `photos.html` 用到这些；行程页 `index.html` 保持零依赖、可离线打开。
