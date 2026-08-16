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

export async function shrink(file, maxEdge = 4096, quality = 0.92) {
  const img = await loadImage(file);
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(img, 0, 0, w, h);

  const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
  if (!blob) throw new Error('压缩失败');
  return { blob, width: w, height: h };
}

/* 原图直传：不重新编码，只读出宽高。仅限浏览器都能显示的格式 ——
   HEIC/Live Photo 必须走 shrink() 转成 JPEG，否则安卓和电脑上是裂图。 */
export const DIRECT_TYPES = /^image\/(jpeg|png|webp)$/;

export async function passthrough(file) {
  const img = await loadImage(file);
  return { blob: file, width: img.naturalWidth, height: img.naturalHeight,
           type: file.type, ext: file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg' };
}

/* ---------- 上传一张（压缩或直传 → Storage → 表） ---------- */

export async function uploadOne(spot, file, { original = false, sort = 0, uid = null } = {}) {
  const direct = original && DIRECT_TYPES.test(file.type);
  const shot = direct ? await passthrough(file) : await shrink(file);
  const ext = direct ? shot.ext : 'jpg';
  const name = `${spot}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const up = await sb.storage.from(CFG.bucket)
    .upload(name, shot.blob, { contentType: direct ? shot.type : 'image/jpeg', cacheControl: '31536000' });
  if (up.error) throw up.error;

  const row = await sb.from(CFG.table).insert({
    spot, path: name, width: shot.width, height: shot.height, sort, created_by: uid
  });
  if (row.error) {
    await sb.storage.from(CFG.bucket).remove([name]);   // 别留孤儿文件
    throw row.error;
  }
  return { path: name, size: shot.blob.size };
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
