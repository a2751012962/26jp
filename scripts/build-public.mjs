/* 把要上线的文件组装进 public/ —— Vercel 的静态输出目录。
 *
 * 只发布站点本身（index.html / photos.html / assets/），仓库里的
 * project/、chats/ 等工作文件不跟着上线。
 */
import { rm, mkdir, cp, copyFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'public');

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

// 根目录所有页面自动收进来，加新页面不用改这里
const pages = (await readdir(root)).filter((f) => f.endsWith('.html'));
for (const f of pages) await copyFile(resolve(root, f), resolve(out, f));
await cp(resolve(root, 'assets'), resolve(out, 'assets'), { recursive: true });

console.log('public/ 组装完成：' + pages.join('、') + '、assets/');
