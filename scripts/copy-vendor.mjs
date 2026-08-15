/* 把 node_modules 里的 dist 文件复制到 assets/vendor/。
 *
 * 本地开发不需要跑这个 —— assets/vendor/ 已经提交进仓库，双击 index.html
 * 就能用。这个脚本只是给 Vercel 构建用的：版本在 package.json 里钉死，
 * 构建时从 npm 取，保证线上和仓库里的是同一份字节。
 *
 * 升级库：改 package.json 的版本号，跑 `npm install && npm run vendor`，
 * 把 assets/vendor/ 的改动一起提交。
 */
import { mkdir, copyFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const FILES = [
  ['@egjs/grid/dist/grid.min.js', 'egjs-grid.min.js'],
  ['photoswipe/dist/photoswipe.esm.min.js', 'photoswipe.esm.min.js'],
  ['photoswipe/dist/photoswipe-lightbox.esm.min.js', 'photoswipe-lightbox.esm.min.js'],
  ['photoswipe/dist/photoswipe.css', 'photoswipe.css'],
  ['@supabase/supabase-js/dist/umd/supabase.js', 'supabase.min.js']
];

await mkdir(resolve(root, 'assets/vendor'), { recursive: true });

for (const [from, to] of FILES) {
  await copyFile(resolve(root, 'node_modules', from), resolve(root, 'assets/vendor', to));
  console.log('vendor <-', to);
}
