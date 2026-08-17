/* 照片功能共用的一层 —— photos.js 与 upload.js 都从这里取：
 *   · Supabase 客户端（一处创建，一处判空）
 *   · 压缩（默认最长边 4096px / JPEG q0.92，约 1‒2MB，构图细节都在）
 *   · 「哪些地点有照片」的 localStorage 清单
 *   · 行程里所有带 slug 的地点清单（给上传页的下拉框）
 */

export const CFG = window.TRIP_CONFIG || {};

export const sb = (CFG.url && CFG.anonKey && window.supabase)
  ? window.supabase.createClient(CFG.url, CFG.anonKey)
  : null;

export const publicUrl = (path) =>
  `${CFG.url}/storage/v1/object/public/${CFG.bucket}/${path}`;

/* ---------- 压缩 ---------- */

export function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('读不出这张图')); };
    img.src = url;
  });
}

const MAX_EDGE = 4096;      // 大图：最长边
const JPEG_Q = 0.92;
/* 缩略图按"显示宽度"出：瀑布流列宽上限 340 CSS px，主流 2x 屏需要
   680 物理像素，取 720 留一点余量。q0.8 下单张约 70‒150KB。 */
const THUMB_WIDTH = 720;
const THUMB_Q = 0.8;

function toJpeg(img, w, h, quality) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(img, 0, 0, w, h);
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('压缩失败'))), 'image/jpeg', quality));
}

/* 原图直传只对浏览器都能显示的格式开放 ——
   HEIC/Live Photo 必须转成 JPEG，否则安卓和电脑上是裂图。 */
export const DIRECT_TYPES = /^image\/(jpeg|png|webp)$/;

/* ---------- 上传一张：大图 + 缩略图 → Storage → 表 ----------
   三步任何一步失败都把已传的文件删干净，表和存储桶永远一致。 */

export async function uploadOne(spot, file, { original = false, sort = 0 } = {}) {
  const img = await loadImage(file);

  // 大图：压缩到 4096px，或（原图直传时）原样字节
  let big, bigType, ext, width, height;
  if (original && DIRECT_TYPES.test(file.type)) {
    big = file;
    bigType = file.type;
    ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    width = img.naturalWidth;
    height = img.naturalHeight;
  } else {
    const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    width = Math.round(img.naturalWidth * scale);
    height = Math.round(img.naturalHeight * scale);
    big = await toJpeg(img, width, height, JPEG_Q);
    bigType = 'image/jpeg';
    ext = 'jpg';
  }

  // 缩略图：网格里显示用（全屏才取大图）
  const tw = Math.min(THUMB_WIDTH, img.naturalWidth);
  const th = Math.round(img.naturalHeight * tw / img.naturalWidth);
  const small = await toJpeg(img, tw, th, THUMB_Q);

  const base = `${spot}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const path = `${base}.${ext}`;
  const thumb = `${base}.t.jpg`;

  const up1 = await sb.storage.from(CFG.bucket)
    .upload(path, big, { contentType: bigType, cacheControl: '31536000' });
  if (up1.error) throw up1.error;

  const up2 = await sb.storage.from(CFG.bucket)
    .upload(thumb, small, { contentType: 'image/jpeg', cacheControl: '31536000' });
  if (up2.error) {
    await sb.storage.from(CFG.bucket).remove([path]);
    throw up2.error;
  }

  const row = await sb.from(CFG.table).insert({ spot, path, thumb, width, height, sort });
  if (row.error) {
    await sb.storage.from(CFG.bucket).remove([path, thumb]);
    throw row.error;
  }
  return { path, size: big.size, thumbSize: small.size };
}

/* ---------- 页面通用：提示条 + 选图过滤（photos/upload 两页共用） ---------- */

let toastTimer;
export function toast(msg, ms = 2200) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-on'), ms);
}

/* 过滤出图片文件；被跳过时给出提示，别让人以为按钮坏了。
   某些安卓文件管理器把 HEIC/相机拷出的文件报成 octet-stream。 */
export function filterImages(files) {
  const all = Array.from(files);
  const list = all.filter((f) => f.type.startsWith('image/'));
  if (!list.length && all.length) {
    toast('选中的文件浏览器没认出是图片，试试从「相册」里选', 3200);
  } else if (all.length > list.length) {
    toast(`跳过 ${all.length - list.length} 个非图片文件`, 2600);
  }
  return list;
}

/* ---------- 「哪些地点有照片」清单缓存 ---------- */

export function bumpManifest(spot, remove = false) {
  try {
    const key = CFG.manifestKey || 'trip-photo-spots';
    const set = new Set(JSON.parse(localStorage.getItem(key) || '[]'));
    remove ? set.delete(spot) : set.add(spot);
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch (e) {}
}

/* ---------- 行程里的地点清单（slug 去重，记全出现的天） ---------- */

export function spotList() {
  const seen = new Map();
  for (const day of window.TRIP.days) {
    for (const b of day.blocks) {
      if (b.t === 'row' && b.spot) {
        if (!seen.has(b.spot)) seen.set(b.spot, { spot: b.spot, place: b.place, days: [] });
        const entry = seen.get(b.spot);
        if (!entry.days.includes(day.label)) entry.days.push(day.label);
      }
    }
  }
  return Array.from(seen.values());
}
