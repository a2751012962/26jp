/* 示例照片页 —— photos.html?spot=<slug>
 *
 *   · 瀑布流用 @egjs/grid 的 MasonryGrid：列数与列宽按容器实际宽度实时算
 *     （内部走 ResizeObserver），不写死断点数字。
 *   · 每格先按数据库里的宽高设 aspect-ratio 占位，图片加载时不会跳动。
 *   · 点开是 PhotoSwipe 全屏，可捏合缩放、左右滑。
 *   · 上传走 photo-core.js：压到最长边 4096px / JPEG q0.92（约 1‒2MB）。
 *     批量传、原图直传在专门的 upload.html。
 *   · 免登录：拿到链接就能看、能传、能删（链接只私下分享，RLS 已放开）。
 */
import PhotoSwipeLightbox from './vendor/photoswipe-lightbox.esm.min.js';
import { CFG, sb, publicUrl, uploadOne, bumpManifest, toast, filterImages } from './photo-core.js';
import { createWall } from './wall.js';

const $ = (id) => document.getElementById(id);
const wall = $('wall');
const statusEl = $('status');

/* ---------- 这个 slug 是哪个地点 ---------- */

const params = new URLSearchParams(location.search);
const spot = params.get('spot') || '';
const fromDay = params.get('day');

/* 同一个 slug 会出现在多天（七里ヶ浜、稲取荘 —— 共用照片是故意的），
   所以优先匹配网址里带的 ?day=，抬头和返回键才是点进来的那一天。 */
function findSpot(slug, dayLabel) {
  let first = null;
  for (const day of window.TRIP.days) {
    for (const b of day.blocks) {
      if (b.t === 'row' && b.spot === slug) {
        if (dayLabel && day.label === dayLabel) return { day, row: b };
        first = first || { day, row: b };
      }
    }
  }
  return first;
}

const found = findSpot(spot, fromDay);
if (found) {
  document.title = found.row.place + ' · 示例照片';
  $('spot-name').textContent = found.row.place;
  $('spot-day').textContent = found.day.eyebrow + '　' + found.row.time;
  // 返回时回到这一天的卡片
  $('back').href = 'index.html?day=' + encodeURIComponent(found.day.label);
}

// 从行程页点进来的就直接后退（滚动位置由浏览器还原，比重新加载更准）；
// 从聊天软件/搜索链接进来的，referrer 是外站，后退会跳出本站 —— 走 href。
$('back').addEventListener('click', (e) => {
  let sameSite = false;
  try { sameSite = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch (err) {}
  if (sameSite && history.length > 1) {
    e.preventDefault();
    history.back();
  }
});

/* ---------- 瀑布流 ---------- */

const wallCmp = createWall(wall);
let photos = [];

function renderWall() {
  wall.textContent = '';

  for (const p of photos) {
    const fig = document.createElement('figure');
    fig.className = 'shot';
    fig.dataset.id = p.id;
    fig.dataset.ratio = p.width / p.height;   // 布局直接用它算高度，不测量

    const a = document.createElement('a');
    a.href = publicUrl(p.path);
    a.dataset.pswpWidth = p.width;
    a.dataset.pswpHeight = p.height;
    a.target = '_blank';
    a.rel = 'noreferrer';

    const img = document.createElement('img');
    img.className = 'shot__img';
    img.decoding = 'async';
    img.alt = p.caption || (found ? found.row.place : '示例照片');
    img.style.setProperty('--ar', `${p.width} / ${p.height}`);
    // 网格加载 720px 缩略图，点开全屏才取大图；旧行没有缩略图就回落到大图。
    // src 由下面的 IntersectionObserver 按滚动位置提前 2000px 赋值 ——
    // iOS Safari 的原生 loading=lazy 预取距离太短，4G 下滚动会跑赢下载。
    img.dataset.src = publicUrl(p.thumb || p.path);
    // 位置在加载前就由 aspect-ratio 定好了，所以这里只负责淡入；
    // 万一实际比例和数据库不符，observeChildren 会自己触发重排。
    img.addEventListener('load', () => img.classList.add('is-loaded'));
    // 请求失败（离线、文件被删）：标出来，别让格子永远"呼吸"下去
    img.addEventListener('error', () => fig.classList.add('shot--err'));

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
  wallCmp.render();
  watchLazy();
}

/* 提前 2000px（约三屏）开始下载：看当前屏时后面的图已经在路上 */
let lazyIO = null;

function watchLazy() {
  lazyIO?.disconnect();
  lazyIO = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      const im = en.target;
      if (im.dataset.src) {
        im.src = im.dataset.src;
        delete im.dataset.src;
      }
      lazyIO.unobserve(im);
    }
  }, { rootMargin: '2000px 0px' });
  wall.querySelectorAll('img.shot__img[data-src]').forEach((im) => lazyIO.observe(im));
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
    .select('id, spot, path, thumb, width, height, caption, sort, created_at')
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
    statusEl.textContent = '这个地点还没有示例照片。\n点右上角「上传照片」加几张构图参考。';
  }
  renderWall();
}

/* ---------- 上传（压缩与写库在 photo-core.js） ---------- */

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
  const list = filterImages(files);
  if (!list.length) return;

  const bar = progressBar();
  const btn = $('upload');
  btn.disabled = true;
  let ok = 0;

  for (let i = 0; i < list.length; i++) {
    bar.set(i / list.length);
    try {
      await uploadOne(spot, list[i], { sort: photos.length + ok });
      ok++;
    } catch (err) {
      toast('第 ' + (i + 1) + ' 张上传失败：' + (err.message || err), 3200);
    }
  }

  bar.done();
  btn.disabled = false;
  if (ok) {
    toast(`已上传 ${ok} 张`);
    bumpManifest(spot);
    await load();
  }
}

async function removePhoto(p) {
  if (!confirm('删除这张照片？')) return;
  const row = await sb.from(CFG.table).delete().eq('id', p.id);
  if (row.error) { toast('删除失败：' + row.error.message, 3000); return; }
  const gone = await sb.storage.from(CFG.bucket).remove([p.path, p.thumb].filter(Boolean));
  if (gone.error) toast('照片已删掉，但存储文件没清干净：' + gone.error.message, 3200);
  else toast('已删除');
  await load();
  if (!photos.length) bumpManifest(spot, true);
}

/* ---------- 按钮 ---------- */

$('bulk').href = 'upload.html' + (spot ? '?spot=' + encodeURIComponent(spot) : '');

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

load();
