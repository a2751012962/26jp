/* 瀑布流照片墙 —— 自算布局，不做任何"渲染后测量"。
 *
 * 为什么不用现成瀑布流库：库不知道每张图多高，只能"先渲染再测量"；
 * 在手机上（列窄、竖图多）egjs 会拿套用列宽之前的高度定位，图片缩回
 * 真实尺寸后位置不重算，版面上留下大块空洞（实测 390px 宽下洞高 425px
 * 且永不自愈）。而我们数据库里存着每张图的宽高 —— 布局就是纯数学：
 *
 *   列数 = ceil(容器宽 / 340)，列宽均分；
 *   每张图高 = 列宽 / 宽高比（与 CSS aspect-ratio 完全一致，图片加载
 *   前后都不变）＋ 说明文字实际高度；
 *   逐张放进当前最短的列。
 *
 * 说明文字的换行高度依赖列宽，所以先统一定宽、再读一次 offsetHeight、
 * 最后一次性写 transform —— 一读一写，无回流抖动，无空洞可言。
 *
 * 间隙随容器宽度走：宽度的 1.8%，夹 6‒16px（手机 ~7px，桌面 16px）。
 */

const MAX_COLUMN = 340;
const gapFor = (w) => Math.max(6, Math.min(16, Math.round(w * 0.018)));

export function createWall(container) {
  let ro = null;
  let raf = 0;

  function layout() {
    const w = container.clientWidth;
    const figs = Array.from(container.children);
    if (!w || !figs.length) return;

    const gap = gapFor(w);
    const n = Math.max(1, Math.ceil(w / MAX_COLUMN));
    const colW = (w - gap * (n - 1)) / n;

    // 一写：统一列宽（说明文字按这个宽度换行）
    for (const f of figs) f.style.width = colW + 'px';

    // 一读：说明文字高度（图片高度不用读，比例是已知数据）
    const capH = figs.map((f) => {
      const cap = f.querySelector('figcaption');
      return cap ? cap.offsetHeight : 0;
    });

    // 纯数学定位：放进当前最短的列
    const tops = new Array(n).fill(0);
    figs.forEach((f, i) => {
      const ratio = parseFloat(f.dataset.ratio) || 1.5;
      const h = colW / ratio + capH[i];
      let c = 0;
      for (let k = 1; k < n; k++) if (tops[k] < tops[c]) c = k;
      f.style.transform = `translate(${Math.round(c * (colW + gap))}px, ${Math.round(tops[c])}px)`;
      tops[c] += h + gap;
    });
    container.style.height = Math.round(Math.max(...tops) - gap) + 'px';
  }

  function schedule() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(layout);
  }

  return {
    /* 调用方先把 <figure>（带 data-ratio=宽/高）画进 container，再调 render() */
    render() {
      if (!container.children.length) {
        this.destroy();
        return;
      }
      if (!ro) {
        ro = new ResizeObserver(schedule);   // 转屏/分屏即时重排
        ro.observe(container);
      }
      layout();
    },
    destroy() {
      cancelAnimationFrame(raf);
      if (ro) { ro.disconnect(); ro = null; }
      container.style.height = '';
    }
  };
}
