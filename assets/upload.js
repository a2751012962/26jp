/* 批量上传页 —— upload.html?spot=<slug>
 *
 *   · 选地点（按行程 slug 去重，标注出现在哪几天）
 *   · 多选 / 拖拽，一次多少张都行；3 张并行，每张一行进度
 *   · 画质：高质量压缩（4096px / q0.92）或原图直传（见 photo-core.js）
 *   · 免登录，拿到链接就能传；一次只跑一批，批内所有输入都锁住
 */
import { CFG, sb, uploadOne, bumpManifest, spotList, toast, filterImages } from './photo-core.js';

const $ = (id) => document.getElementById(id);
const CONCURRENCY = 3;

// Enter 落在下拉框/单选钮上时，别让表单隐式提交把页面刷掉
$('panel').addEventListener('submit', (e) => e.preventDefault());

/* ---------- 日期筛选 + 地点下拉框 ----------
   两者都从 assets/data.js 现场生成：改行程 → 部署后这里自动跟着变，
   不用维护任何清单。 */

const spots = spotList();
const sel = $('spot');
let dayFilter = '';   // '' = 全部

function renderSpotOptions() {
  const cur = sel.value;
  sel.textContent = '';
  for (const s of spots) {
    if (dayFilter && !s.days.includes(dayFilter)) continue;
    const opt = document.createElement('option');
    opt.value = s.spot;
    opt.textContent = `${s.place}（${s.days.join('、')}）`;
    sel.appendChild(opt);
  }
  // 原选择还在筛选结果里就保住；不在就落到第一项，并按"换了地点"清空队列
  if (Array.from(sel.options).some((o) => o.value === cur)) {
    sel.value = cur;
  } else if (sel.options.length) {
    sel.selectedIndex = 0;
    if (cur) resetBatch();   // 首次渲染（cur 为空）不算换地点
  }
}

// 换地点 = 新一批：从头计 sort，清掉旧列表
function resetBatch() {
  batchSeq = 0;
  $('queue').textContent = '';
  $('summary').hidden = true;
}

const dayWrap = $('dayfilter');
['', ...window.TRIP.days.map((d) => d.label)].forEach((label) => {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'chip';
  chip.textContent = label || '全部';
  chip.addEventListener('click', () => {
    dayFilter = label;
    for (const c of dayWrap.children) c.setAttribute('aria-current', String(c === chip));
    renderSpotOptions();
  });
  dayWrap.appendChild(chip);
});
dayWrap.firstChild.setAttribute('aria-current', 'true');

renderSpotOptions();
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

/* 批内把所有会改变去向的输入都锁住：地点、日期条、拖拽框、文件选择。
   否则上传中途换地点/换筛选会触发 resetBatch()，把 sort 归零、清掉
   进度列表，而在途的 worker 还在按旧序号写库。 */
let running = false;

function setBusy(on) {
  running = on;
  sel.disabled = on;
  for (const c of dayWrap.children) c.disabled = on;
  drop.classList.toggle('is-disabled', on);
  $('file').disabled = on;
}

async function runBatch(files) {
  if (running) {
    toast('上一批还在传，等它完成再加');
    return;
  }
  const list = filterImages(files);
  if (!list.length) return;

  const spot = currentSpot();
  const original = document.querySelector('input[name="q"]:checked').value === 'raw';
  setBusy(true);
  $('summary').hidden = true;

  // 新照片排在该地点已有照片之后；查不到就别猜，猜错会把已有排序打乱
  if (batchSeq === 0) {
    const { count, error } = await sb.from(CFG.table)
      .select('id', { count: 'exact', head: true }).eq('spot', spot);
    if (error) {
      setBusy(false);
      toast('读取该地点已有照片数失败，稍后再试：' + error.message, 3200);
      return;
    }
    batchSeq = count || 0;
  }

  const rows = list.map((f) => row(f));
  let ok = 0;

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
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, list.length) }, worker));

  setBusy(false);
  if (ok) bumpManifest(spot);
  $('summary').hidden = false;
  $('summary-text').textContent =
    ok === list.length ? `全部 ${ok} 张上传完成` : `${ok}/${list.length} 张上传成功，失败的重选一次即可`;
}

/* ---------- 选择与拖拽 ---------- */

const drop = $('drop');
drop.addEventListener('click', () => { if (!running) $('file').click(); });
drop.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!running) $('file').click(); }
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

sel.addEventListener('change', resetBatch);

/* ---------- 孤儿检测 ----------
   照片只认 slug。行程里改了 slug 或删了地点后，那批照片不会丢，
   只是没了入口。这里把「库里有照片、行程里却查无此地」的 slug 摆出来，
   免得改行程后照片悄悄"消失"却没人发现。 */

async function checkOrphans() {
  if (!sb) return;
  const { data, error } = await sb.from(CFG.table).select('spot');
  if (error || !data) return;   // 离线就算了，下次打开再查
  const known = new Set(spots.map((s) => s.spot));
  const orphans = [...new Set(data.map((r) => r.spot))].filter((s) => !known.has(s));
  if (!orphans.length) return;

  const box = $('orphans');
  box.hidden = false;
  box.textContent = '';
  const head = document.createElement('div');
  head.className = 'up-orphans__head';
  head.textContent = '⚠ 下面这些地点在库里有照片，但行程里已经没有这个 slug（改过 slug 或删过地点？）。照片都还在，点进去可以看：';
  box.appendChild(head);
  for (const s of orphans) {
    const a = document.createElement('a');
    a.className = 'up-orphans__link';
    a.href = 'photos.html?spot=' + encodeURIComponent(s);
    a.textContent = s;
    box.appendChild(a);
  }
  const tail = document.createElement('div');
  tail.className = 'up-orphans__tail';
  tail.textContent = '想把它们迁到现在行程里的某个地点，改一下数据库里的 spot 字段即可（或者告诉 Claude 帮你迁）。';
  box.appendChild(tail);
}
checkOrphans();
