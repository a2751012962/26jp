/* 包车行程卡 —— 渲染 + 交互
 *
 * 交互：
 *   · 左右滑动卡片（scroll-snap），日期条自动跟随并把选中日居中
 *   · 浏览器记住上次看的是哪一天（localStorage）
 *   · 点地点名即复制，底部弹出提示
 *
 * 可选参数（写在网址后面，例：index.html?brief=1&density=tight）：
 *   accent  = blue | green | rust      主色
 *   density = loose | normal | tight   行距
 *   brief   = 1                        精简版：隐藏灰色备注与「如果」备用方案
 *   day     = 8/20 或 4                直接打开某一天（优先于记忆）
 */
(function () {
  'use strict';

  var TRIP = window.TRIP;
  var days = TRIP.days;

  /* ---------- 外观参数 ---------- */

  var ACCENTS = {
    blue:  ['oklch(0.55 0.09 245)', 'oklch(0.45 0.09 245)', 'oklch(0.96 0.02 245)', 'oklch(0.35 0.03 245)'],
    green: ['oklch(0.5 0.08 165)',  'oklch(0.4 0.07 165)',  'oklch(0.95 0.02 165)', 'oklch(0.32 0.03 165)'],
    rust:  ['oklch(0.53 0.1 40)',   'oklch(0.43 0.09 40)',  'oklch(0.96 0.02 40)',  'oklch(0.34 0.03 40)']
  };
  // 与 --row-pad 同一把尺（都是卡片基准字号的倍数）
  var DENSITY = { loose: '1.3em', tight: '0.5em' };

  var params = new URLSearchParams(location.search);
  var root = document.documentElement;

  var accent = ACCENTS[params.get('accent')];
  if (accent) {
    root.style.setProperty('--ac', accent[0]);
    root.style.setProperty('--acDeep', accent[1]);
    root.style.setProperty('--acSoft', accent[2]);
    root.style.setProperty('--acInk', accent[3]);
  }

  var rp = DENSITY[params.get('density')];
  if (rp) root.style.setProperty('--rp', rp);

  if (params.get('brief') === '1') {
    root.style.setProperty('--note', 'none');
    root.style.setProperty('--fb', 'none');
  }

  /* ---------- 渲染 ---------- */

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  var spotNodes = [];   // 所有带 spot slug 的地点名节点

  /* 图标用真实的 <svg> 元素画出来 —— 不用 CSS mask。mask 在分数 em 尺寸下
     会被光栅化舍入，某些屏幕分辨率上图标会缺一半；SVG 是矢量的，不会。
     图形来自 Lucide（MIT）。 */
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var ICONS = {
    // copy
    copy: ['M9 9h11a2 2 0 0 1 2 2v11H9z', 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'],
    // camera
    camera: ['M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z',
             'M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z']
  };

  function icon(name, cls) {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'ico ico--' + name + (cls ? ' ' + cls : ''));
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    ICONS[name].forEach(function (d) {
      var path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', d);
      svg.appendChild(path);
    });
    return svg;
  }

  function renderRow(b, dayLabel) {
    var row = el('div', 'row' + (b.tall ? ' row--tall' : ''));

    var time = el('div', 'time' + (b.kind ? ' time--' + b.kind : ''), b.time || '');
    row.appendChild(time);

    var mid = el('div');
    var copyable = b.copy !== false;
    var place = el('div', 'place' + (copyable ? ' place--copy' : ''));
    // 名字单独包一层，复制时才不会把图标的空白也带进去
    place.appendChild(el('span', 'place__text', b.place || ''));
    if (copyable) {
      place.setAttribute('role', 'button');
      place.setAttribute('tabindex', '0');
      place.title = '点击复制地点名';
      place.appendChild(icon('copy'));
    }
    // 相机按钮由 applyPhotoIcons() 按"这个地点有没有照片"后补。
    // 日期也记下来：同一个 slug 会出现在多天（七里ヶ浜、稲取荘），
    // 照片页靠它显示正确的那天、返回时回到正确的卡。
    if (b.spot) {
      place.dataset.spot = b.spot;
      place.dataset.day = dayLabel;
      spotNodes.push(place);
    }
    mid.appendChild(place);

    if (b.note) {
      mid.appendChild(el('div', 'note' + (b.noteWarn ? ' note--warn' : ''), b.note));
    }
    row.appendChild(mid);

    row.appendChild(el('div', 'dur', b.dur || ''));
    return row;
  }

  function renderPair(cls, label, text) {
    var box = el('div', cls);
    box.appendChild(el('div', cls + '__label', label));
    box.appendChild(el('div', cls + '__text', text));
    return box;
  }

  function renderLegend() {
    var box = el('div', 'legend');
    box.appendChild(el('span', 'legend__go', '■ 出发时间'));
    box.appendChild(el('span', 'legend__fixed', '■ 已预约·不能迟到'));
    box.appendChild(el('span', null, '■ 备用方案'));
    box.appendChild(el('span', null, '地点名后有图标 · 点一下即复制'));
    return box;
  }

  function renderLodging(b) {
    var box = el('div', 'lodging');
    box.appendChild(el('div', 'lodging__title', b.title));
    b.rows.forEach(function (r) {
      var line = el('div', 'lodging__row');
      line.appendChild(el('div', null, r[0]));
      line.appendChild(el('div', null, r[1]));
      line.appendChild(el('div', 'lodging__area', r[2]));
      box.appendChild(line);
    });
    var foot = el('div', 'lodging__foot');
    b.footer.forEach(function (line, i) {
      if (i) foot.appendChild(document.createElement('br'));
      foot.appendChild(document.createTextNode(line));
    });
    box.appendChild(foot);
    return box;
  }

  function renderDay(day) {
    var card = el('section', 'card');
    card.id = day.id;
    card.setAttribute('aria-label', day.eyebrow);

    var head = el('div', 'head');
    var left = el('div');
    left.appendChild(el('div', 'eyebrow', day.eyebrow));
    left.appendChild(el('div', 'title', day.title));
    head.appendChild(left);
    if (day.tag) head.appendChild(el('div', 'tag tag--' + day.tag.kind, day.tag.text));
    card.appendChild(head);

    day.blocks.forEach(function (b) {
      if (b.t === 'row') card.appendChild(renderRow(b, day.label));
      else if (b.t === 'fallback') card.appendChild(renderPair('fallback', '如果', b.text));
      else if (b.t === 'plan') card.appendChild(renderPair('plan', b.label, b.text));
      else if (b.t === 'warn') card.appendChild(renderPair('warn', '⚠', b.text));
      else if (b.t === 'legend') card.appendChild(renderLegend());
      else if (b.t === 'lodging') card.appendChild(renderLodging(b));
    });

    return card;
  }

  var rail = document.getElementById('rail');
  var chips = document.getElementById('chips');
  var toast = document.getElementById('toast');
  var prevBtn = document.getElementById('prev');
  var nextBtn = document.getElementById('next');

  days.forEach(function (day) { rail.appendChild(renderDay(day)); });

  days.forEach(function (day, i) {
    var chip = el('button', 'chip', day.label);
    chip.type = 'button';
    chip.addEventListener('click', function () { go(i); });
    chips.appendChild(chip);
  });

  /* ---------- 日期条 / 滑动 ---------- */

  var idx = 0;

  function clamp(i) { return Math.max(0, Math.min(days.length - 1, i)); }

  function markChips() {
    for (var i = 0; i < chips.children.length; i++) {
      chips.children[i].setAttribute('aria-current', String(i === idx));
    }
  }

  function scrollToCard(i, behavior) {
    var card = rail.children[i];
    if (!card) return;
    rail.scrollTo({ left: card.offsetLeft - rail.offsetLeft, behavior: behavior || 'smooth' });
  }

  function centerChip(i, behavior) {
    var chip = chips.children[i];
    if (!chip) return;
    var target = chip.offsetLeft - chips.offsetLeft - (chips.clientWidth - chip.offsetWidth) / 2;
    chips.scrollTo({ left: Math.max(0, target), behavior: behavior || 'smooth' });
  }

  function remember(i) {
    try { localStorage.setItem(TRIP.storeKey, String(i)); } catch (e) {}
  }

  function setIdx(i, behavior) {
    idx = clamp(i);
    markChips();
    centerChip(idx, behavior);
    remember(idx);
  }

  function go(i) {
    setIdx(i);
    scrollToCard(idx);
  }

  prevBtn.addEventListener('click', function () { go(idx - 1); });
  nextBtn.addEventListener('click', function () { go(idx + 1); });

  var scrollTimer;
  rail.addEventListener('scroll', function () {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function () {
      var mid = rail.scrollLeft + rail.clientWidth / 2;
      var best = 0, dist = Infinity;
      for (var i = 0; i < rail.children.length; i++) {
        var c = rail.children[i];
        var d = Math.abs(c.offsetLeft - rail.offsetLeft + c.offsetWidth / 2 - mid);
        if (d < dist) { dist = d; best = i; }
      }
      if (best !== idx) setIdx(best);
    }, 90);
  }, { passive: true });

  // 转屏 / 改窗口宽度后，把当前这天重新对齐回屏幕中间
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      scrollToCard(idx, 'auto');
      centerChip(idx, 'auto');
    }, 120);
  });

  /* ---------- 哪些地点有示例照片 ----------
     清单缓存在 localStorage，所以离线打开时相机图标也在。联网后再拉一次
     最新的，有变化就就地补上／去掉图标，不重建卡片（重建会丢滚动位置）。 */

  var MANIFEST_KEY = (window.TRIP_CONFIG && window.TRIP_CONFIG.manifestKey) || 'trip-photo-spots';
  var photoSpots = new Set();

  /* 摄影师模式：所有带 slug 的地点都显示相机入口（没照片的是半透明空心），
     否则第一张照片没有地方可传。两种方式进入：
       · 这台设备在照片页登录过 —— supabase-js 会把会话存在
         localStorage 的 sb-…-auth-token 键下，读键名即可判断，不用引库；
       · 网址加 ?edit=1（换设备/会话过期时的兜底）。
     其他人始终只看到有照片的地点，卡片保持干净。 */
  function isEditor() {
    if (params.get('edit') === '1') return true;
    try {
      for (var i = 0; i < localStorage.length; i++) {
        if (/^sb-.+-auth-token$/.test(localStorage.key(i))) return true;
      }
    } catch (e) {}
    return false;
  }
  var editor = isEditor();

  function readManifestCache() {
    try {
      var raw = JSON.parse(localStorage.getItem(MANIFEST_KEY) || '[]');
      if (Array.isArray(raw)) photoSpots = new Set(raw);
    } catch (e) {}
  }

  function applyPhotoIcons() {
    spotNodes.forEach(function (place) {
      var spot = place.dataset.spot;
      var link = place.querySelector('.ico-btn');
      var has = photoSpots.has(spot);
      var want = has || editor;
      if (want && !link) {
        var name = place.querySelector('.place__text').textContent;
        link = el('a', 'ico-btn');
        link.href = 'photos.html?spot=' + encodeURIComponent(spot) +
                    '&day=' + encodeURIComponent(place.dataset.day || '');
        link.title = '看「' + name + '」的示例照片';
        link.setAttribute('aria-label', '看「' + name + '」的示例照片');
        link.appendChild(icon('camera'));
        place.appendChild(link);
      } else if (!want && link) {
        link.remove();
      }
      if (link && !link.isConnected) link = null;
      if (link) link.classList.toggle('ico-btn--empty', !has);
    });
  }

  function refreshManifest() {
    var cfg = window.TRIP_CONFIG;
    if (!cfg || !cfg.url || !cfg.anonKey) return;
    fetch(cfg.url + '/rest/v1/' + (cfg.table || 'spot_photos') + '?select=spot', {
      headers: { apikey: cfg.anonKey, Authorization: 'Bearer ' + cfg.anonKey }
    })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (rows) {
        var fresh = new Set(rows.map(function (r) { return r.spot; }));
        var same = fresh.size === photoSpots.size &&
          Array.from(fresh).every(function (s) { return photoSpots.has(s); });
        photoSpots = fresh;
        try { localStorage.setItem(MANIFEST_KEY, JSON.stringify(Array.from(fresh))); } catch (e) {}
        if (!same) applyPhotoIcons();
      })
      .catch(function () { /* 离线就用缓存，静默 */ });
  }

  /* ---------- 点击复制地点名 ---------- */

  var toastTimer;

  function flashToast() {
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('is-on'); }, 1200);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(flashToast, flashToast);
      return;
    }
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    flashToast();
  }

  function copyFrom(node) {
    var text = node.querySelector('.place__text');
    copyText(((text || node).textContent || '').trim());
  }

  rail.addEventListener('click', function (e) {
    if (e.target.closest('.ico-btn')) return;   // 相机按钮只跳转，不复制
    var node = e.target.closest('.place--copy');
    if (node) copyFrom(node);
  });

  rail.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (e.target.closest('.ico-btn')) return;
    var node = e.target.closest('.place--copy');
    if (!node) return;
    e.preventDefault();
    copyFrom(node);
  });

  /* ---------- 打开时定位到哪一天 ---------- */

  function initialIndex() {
    var wanted = (params.get('day') || '').trim();
    if (wanted) {
      var byLabel = days.findIndex(function (d) { return d.label === wanted; });
      if (byLabel >= 0) return byLabel;
      // 纯数字才当第 n 天用：parseInt('8/26') 会得到 8，悄悄开到错的那天
      if (/^\d+$/.test(wanted)) {
        var n = parseInt(wanted, 10);
        if (n >= 1 && n <= days.length) return n - 1;
      }
    }
    try {
      var saved = parseInt(localStorage.getItem(TRIP.storeKey) || '0', 10);
      if (!isNaN(saved)) return clamp(saved);
    } catch (e) {}
    return 0;
  }

  var start = initialIndex();
  setIdx(start, 'auto');
  requestAnimationFrame(function () {
    scrollToCard(start, 'auto');
    centerChip(start, 'auto');
  });

  readManifestCache();
  applyPhotoIcons();
  refreshManifest();
})();
