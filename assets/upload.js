/* 批量上传页 —— upload.html?spot=<slug>
 *
 *   · 选地点（按行程 slug 去重，标注出现在哪几天）
 *   · 多选 / 拖拽，一次多少张都行；3 张并行，每张一行进度
 *   · 画质：高质量压缩（4096px / q0.92）或原图直传（见 photo-core.js）
 *   · 只有登录后才看得到上传面板
 */
import { CFG, sb, uploadOne, bumpManifest, spotList } from './photo-core.js';

const $ = (id) => document.getElementById(id);
const CONCURRENCY = 3;

let toastTimer;
function toast(msg, ms = 2200) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-on'), ms);
}

/* ---------- 地点下拉框 ---------- */

const spots = spotList();
const sel = $('spot');
for (const s of spots) {
  const opt = document.createElement('option');
  opt.value = s.spot;
  opt.textContent = `${s.place}（${s.days.join('、')}）`;
  sel.appendChild(opt);
}
const wanted = new URLSearchParams(location.search).get('spot');
if (wanted && spots.some((s) => s.spot === wanted)) sel.value = wanted;

function currentSpot() { return sel.value; }

$('view').addEventListener('click', (e) => {
  e.preventDefault();
  location.href = 'photos.html?spot=' + encodeURIComponent(currentSpot());
});

/* ---------- 服务配置检查（不需要登录） ---------- */

if (!sb) {
  $('panel').hidden = true;
  $('gate').hidden = false;
  $('gate').textContent = '没配置照片服务（assets/config.js）。';
}

/* ---------- 上传队列 ---------- */

const queue = $('queue');
let batchSeq = 0;   // 同一地点多次追加时 sort 继续往后排

const fmtMB = (n) => (n / 1048576).toFixed(1) + 'MB';

function row(file) {
  const li = document.createElement('li');
  li.className = 'up-item';
  const name = document.createElement('span');
  name.className = 'up-item__name';
  name.textContent = file.name;
  const state = document.createElement('span');
  state.className = 'up-item__state';
  state.textContent = '等待…';
  li.append(name, state);
  queue.appendChild(li);
  return {
    set(text, cls) {
      state.textContent = text;
      li.className = 'up-item' + (cls ? ' up-item--' + cls : '');
    }
  };
}

async function runBatch(files) {
  const all = Array.from(files);
  const list = all.filter((f) => f.type.startsWith('image/'));
  if (!list.length) {
    if (all.length) toast('选中的文件浏览器没认出是图片，试试从「相册」里选', 3200);
    return;
  }
  if (all.length > list.length) toast(`跳过 ${all.length - list.length} 个非图片文件`, 2600);

  const spot = currentSpot();
  const original = document.querySelector('input[name="q"]:checked').value === 'raw';
  sel.disabled = true;
  $('summary').hidden = true;

  // 新照片排在该地点已有照片之后
  if (batchSeq === 0) {
    const { count } = await sb.from(CFG.table)
      .select('id', { count: 'exact', head: true }).eq('spot', spot);
    batchSeq = count || 0;
  }

  const rows = list.map((f) => row(f));
  let done = 0, ok = 0;

  let next = 0;
  async function worker() {
    while (next < list.length) {
      const i = next++;
      const file = list[i];
      rows[i].set(original ? '上传中…' : '压缩中…', 'busy');
      try {
        const r = await uploadOne(spot, file, { original, sort: batchSeq++ });
        ok++;
        rows[i].set(`✓ ${fmtMB(file.size)} → ${fmtMB(r.size)}`, 'ok');
      } catch (err) {
        rows[i].set('✕ ' + (err.message || err), 'err');
      }
      done++;
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, list.length) }, worker));

  sel.disabled = false;
  if (ok) bumpManifest(spot);
  $('summary').hidden = false;
  $('summary-text').textContent =
    ok === list.length ? `全部 ${ok} 张上传完成` : `${ok}/${list.length} 张上传成功，失败的重选一次即可`;
}

/* ---------- 选择与拖拽 ---------- */

const drop = $('drop');
drop.addEventListener('click', () => $('file').click());
drop.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('file').click(); }
});
$('file').addEventListener('change', (e) => {
  runBatch(e.target.files);
  e.target.value = '';
});
['dragover', 'dragenter'].forEach((t) =>
  drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('is-over'); }));
['dragleave', 'drop'].forEach((t) =>
  drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('is-over'); }));
drop.addEventListener('drop', (e) => runBatch(e.dataTransfer.files));

// 切换地点 = 新一批，从头计 sort，清掉旧列表
sel.addEventListener('change', () => {
  batchSeq = 0;
  queue.textContent = '';
  $('summary').hidden = true;
});
