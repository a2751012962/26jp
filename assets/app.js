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
  var DENSITY = {
    loose: 'clamp(16px,2.6vw,32px)',
    tight: 'clamp(7px,1.1vw,12px)'
  };

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

  function renderRow(b) {
    var row = el('div', 'row' + (b.tall ? ' row--tall' : ''));

    var time = el('div', 'time' + (b.kind ? ' time--' + b.kind : ''), b.time || '');
    row.appendChild(time);

    var mid = el('div');
    var copyable = b.copy !== false;
    var place = el('div', 'place' + (copyable ? ' place--copy' : ''), b.place || '');
    if (copyable) {
      place.setAttribute('role', 'button');
      place.setAttribute('tabindex', '0');
      place.title = '点击复制地点名';
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
      if (b.t === 'row') card.appendChild(renderRow(b));
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
    copyText((node.textContent || '').trim());
  }

  rail.addEventListener('click', function (e) {
    var node = e.target.closest('.place--copy');
    if (node) copyFrom(node);
  });

  rail.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var node = e.target.closest('.place--copy');
    if (!node) return;
    e.preventDefault();
    copyFrom(node);
  });

  /* ---------- 打开时定位到哪一天 ---------- */

  function initialIndex() {
    var wanted = params.get('day');
    if (wanted) {
      var byLabel = days.findIndex(function (d) { return d.label === wanted; });
      if (byLabel >= 0) return byLabel;
      var n = parseInt(wanted, 10);
      if (n >= 1 && n <= days.length) return n - 1;
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
})();
