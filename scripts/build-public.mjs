/* 把要上线的文件组装进 public/ —— Vercel 的静态输出目录。
 *
 * 只发布站点本身（index.html / photos.html / assets/），仓库里的
 * project/、chats/ 等工作文件不跟着上线。
 */
import { rm, mkdir, cp, copyFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'public');

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

await copyFile(resolve(root, 'index.html'), resolve(out, 'index.html'));
await copyFile(resolve(root, 'photos.html'), resolve(out, 'photos.html'));
await cp(resolve(root, 'assets'), resolve(out, 'assets'), { recursive: true });

console.log('public/ 组装完成');
