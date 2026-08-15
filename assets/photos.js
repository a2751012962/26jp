/* 示例照片页 —— photos.html?spot=<slug>
 *
 *   · 瀑布流用 @egjs/grid 的 MasonryGrid：列数与列宽按容器实际宽度实时算
 *     （内部走 ResizeObserver），不写死断点数字。
 *   · 每格先按数据库里的宽高设 aspect-ratio 占位，图片加载时不会跳动。
 *   · 点开是 PhotoSwipe 全屏，可捏合缩放、左右滑。
 *   · 上传前在浏览器里压到最长边 2560px / JPEG q0.85，顺手读出宽高。
 *   · 谁都能看；只有登录的人（你）看得到上传和管理按钮。
 */
import PhotoSwipeLightbox from './vendor/photoswipe-lightbox.esm.min.js';

const CFG = window.TRIP_CONFIG;
const MAX_EDGE = 2560;
const JPEG_Q = 0.85;

const $ = (id) => document.getElementById(id);
const wall = $('wall');
const statusEl = $('status');

/* ---------- 这个 slug 是哪个地点 ---------- */

const spot = new URLSearchParams(location.search).get('spot') || '';

function findSpot(slug) {
  for (const day of window.TRIP.days) {
    for (const b of day.blocks) {
      if (b.t === 'row' && b.spot === slug) return { day, row: b };
    }
  }
  return null;
}

const found = findSpot(spot);
if (found) {
  document.title = found.row.place + ' · 示例照片';
  $('spot-name').textContent = found.row.place;
  $('spot-day').textContent = found.day.eyebrow + '　' + found.row.time;
  // 返回时回到这一天的卡片
  $('back').href = 'index.html?day=' + encodeURIComponent(found.day.label);
}

// 有历史记录就直接后退，滚动位置由浏览器自己还原，比重新加载更准
$('back').addEventListener('click', (e) => {
  if (document.referrer && history.length > 1) {
    e.preventDefault();
    history.back();
  }
});

/* ---------- Supabase ---------- */

const sb = (CFG && CFG.url && window.supabase)
  ? window.supabase.createClient(CFG.url, CFG.anonKey)
  : null;

const publicUrl = (path) =>
  `${CFG.url}/storage/v1/object/public/${CFG.bucket}/${path}`;

/* ---------- 提示条 ---------- */

let toastTimer;
function toast(msg, ms = 1800) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-on'), ms);
}

/* ---------- 瀑布流 ---------- */

let grid = null;
let photos = [];

function renderWall() {
  wall.textContent = '';

  for (const p of photos) {
    const fig = document.createElement('figure');
    fig.className = 'shot';
    fig.dataset.id = p.id;

    const a = document.createElement('a');
    a.href = publicUrl(p.path);
    a.dataset.pswpWidth = p.width;
    a.dataset.pswpHeight = p.height;
    a.target = '_blank';
    a.rel = 'noreferrer';

    const img = document.createElement('img');
    img.className = 'shot__img';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.alt = p.caption || (found ? found.row.place : '示例照片');
    img.style.setProperty('--ar', `${p.width} / ${p.height}`);
    img.src = publicUrl(p.path);
    // 位置在加载前就由 aspect-ratio 定好了，所以这里只负责淡入；
    // 万一实际比例和数据库不符，observeChildren 会自己触发重排。
    img.addEventListener('load', () => img.classList.add('is-loaded'));

    a.appendChild(img);
    fig.appendChild(a);

    if (p.caption) {
      const cap = document.createElement('figcaption');
      cap.className = 'shot__cap';
      cap.textContent = p.caption;
      fig.appendChild(cap);
    }

    const del = document.createElement('button');
    del.className = 'shot__del';
    del.type = 'button';
    del.title = '删除这张';
    del.textContent = '×';
    del.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      removePhoto(p);
    });
    fig.appendChild(del);

    wall.appendChild(fig);
  }

  wall.hidden = photos.length === 0;

  if (!photos.length) {
    grid?.destroy();
    grid = null;
    return;
  }

  if (!grid) {
    /* align:'stretch' + maxStretchColumnSize：列数由容器实际宽度自动算出，
       列宽再拉伸到刚好填满，单列不超过 340px。所以没有任何写死的断点 ——
       窄屏自然是 1 列，平板 2〜3 列，桌面 4 列往上，转屏也立刻重排。 */
    grid = new Grid.MasonryGrid(wall, {
      gap: 14,
      align: 'stretch',
      maxStretchColumnSize: 340,
      useResizeObserver: true,
      observeChildren: true
    });
  } else {
    grid.syncElements();
  }
  grid.renderItems();
}

/* ---------- 全屏查看 ---------- */

const lightbox = new PhotoSwipeLightbox({
  gallery: '#wall',
  children: 'a',
  pswpModule: () => import('./vendor/photoswipe.esm.min.js'),
  bgOpacity: 0.94,
  wheelToZoom: true
});
lightbox.init();

/* ---------- 读取照片 ---------- */

async function load() {
  if (!sb) {
    statusEl.textContent = '没配置照片服务（assets/config.js）。';
    return;
  }
  if (!spot) {
    statusEl.textContent = '网址里没有指定地点。';
    return;
  }

  const { data, error } = await sb
    .from(CFG.table)
    .select('id, spot, path, width, height, caption, sort, created_at')
    .eq('spot', spot)
    .order('sort', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    statusEl.textContent = '照片加载失败：' + error.message;
    return;
  }

  photos = data || [];
  statusEl.hidden = photos.length > 0;
  if (!photos.length) {
    statusEl.textContent = signedIn
      ? '这个地点还没有示例照片。\n点右上角「上传照片」加几张构图参考。'
      : '这个地点还没有示例照片。';
  }
  renderWall();
}

/* ---------- 上传：先在浏览器里压缩 ---------- */

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('读不出这张图')); };
    img.src = url;
  });
}

async function shrink(file) {
  const img = await loadImage(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(img, 0, 0, w, h);

  const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', JPEG_Q));
  if (!blob) throw new Error('压缩失败');
  return { blob, width: w, height: h };
}

function progressBar() {
  const bar = document.createElement('div');
  bar.className = 'pprogress';
  document.body.appendChild(bar);
  return {
    set: (frac) => { bar.style.width = Math.round(frac * 100) + '%'; },
    done: () => { bar.style.width = '100%'; setTimeout(() => bar.remove(), 400); }
  };
}

async function uploadFiles(files) {
  const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
  if (!list.length) return;

  const bar = progressBar();
  const btn = $('upload');
  btn.disabled = true;
  let ok = 0;

  for (let i = 0; i < list.length; i++) {
    bar.set(i / list.length);
    try {
      const { blob, width, height } = await shrink(list[i]);
      const name = `${spot}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

      const up = await sb.storage.from(CFG.bucket)
        .upload(name, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
      if (up.error) throw up.error;

      const { data: sess } = await sb.auth.getUser();
      const row = await sb.from(CFG.table).insert({
        spot, path: name, width, height,
        sort: photos.length + ok,
        created_by: sess?.user?.id ?? null
      });
      if (row.error) {
        await sb.storage.from(CFG.bucket).remove([name]);   // 别留孤儿文件
        throw row.error;
      }
      ok++;
    } catch (err) {
      toast('第 ' + (i + 1) + ' 张上传失败：' + (err.message || err), 3200);
    }
  }

  bar.done();
  btn.disabled = false;
  if (ok) {
    toast(`已上传 ${ok} 张`);
    bumpManifest();
    await load();
  }
}

async function removePhoto(p) {
  if (!confirm('删除这张照片？')) return;
  const row = await sb.from(CFG.table).delete().eq('id', p.id);
  if (row.error) { toast('删除失败：' + row.error.message, 3000); return; }
  await sb.storage.from(CFG.bucket).remove([p.path]);
  toast('已删除');
  await load();
  if (!photos.length) bumpManifest(true);
}

/* 行程页靠这份缓存决定哪些地点显示相机图标；本页改动后同步一下，
   回去时立刻是对的，不用等下一次联网刷新。 */
function bumpManifest(remove = false) {
  try {
    const key = 'trip-photo-spots';
    const set = new Set(JSON.parse(localStorage.getItem(key) || '[]'));
    remove ? set.delete(spot) : set.add(spot);
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch (e) {}
}

/* ---------- 登录（邮箱 magic link） ---------- */

let signedIn = false;

function paintAuth() {
  $('upload').hidden = !signedIn;
  $('manage').hidden = !signedIn;
  $('signin').hidden = signedIn;
}

async function initAuth() {
  if (!sb) return;
  const { data } = await sb.auth.getSession();
  signedIn = !!data.session;
  paintAuth();
  sb.auth.onAuthStateChange((_e, session) => {
    signedIn = !!session;
    paintAuth();
    if (signedIn) toast('已登录，可以上传了');
  });
}

$('signin').addEventListener('click', () => $('auth').showModal());

$('auth-send').addEventListener('click', async () => {
  const email = $('auth-email').value.trim();
  if (!email) return;
  $('auth-msg').textContent = '发送中…';
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: location.href }
  });
  $('auth-msg').textContent = error
    ? '发送失败：' + error.message
    : '登录链接已发到 ' + email + '，在这台设备上打开它就登录了。';
});

$('upload').addEventListener('click', () => $('file').click());
$('file').addEventListener('change', (e) => {
  uploadFiles(e.target.files);
  e.target.value = '';
});

$('manage').addEventListener('click', () => {
  const on = document.body.classList.toggle('is-managing');
  $('manage').textContent = on ? '完成' : '管理';
});

/* ---------- 开跑 ---------- */

initAuth().then(load);
