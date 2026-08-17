/* 瀑布流照片墙组件 —— 对 @egjs/grid 的 MasonryGrid 包一层。
 *
 * 照成熟组件库的方式管理（模式即学自 egjs-grid 本身的设计）：
 *   · 明确的生命周期：createWall() → render() → destroy()，
 *     网格实例与观察者都由组件私有持有，销毁时一并清理，不泄漏。
 *   · 尺寸参数集中在顶部（设计令牌），不散落在调用处。
 *   · 动态间隙：egjs 把 gap 声明为"渲染属性"——给 grid.gap 赋值
 *     就会自动调度一次重排。我们观察容器宽度，宽度变了重算 gap，
 *     只在值真的变化时赋值，避免无谓渲染。
 *
 * 间隙公式：容器宽度的 1.8%，夹在 6‒16px 之间。
 *   手机 ~375px → 7px（图占满屏幕，缝隙细）
 *   平板 ~768px → 14px
 *   桌面 ≥900px → 16px（大屏留白从容）
 */

const MAX_COLUMN = 340;                 // 单列最宽（CSS px），列数由容器宽度自动算
const gapFor = (w) => Math.max(6, Math.min(16, Math.round(w * 0.018)));

export function createWall(container) {
  let grid = null;
  let ro = null;

  function ensureGrid() {
    if (grid) return grid;
    grid = new Grid.MasonryGrid(container, {
      gap: gapFor(container.clientWidth),
      align: 'stretch',                 // 列宽拉伸到刚好填满
      maxStretchColumnSize: MAX_COLUMN,
      useResizeObserver: true,          // 容器变宽变窄即时重排
      observeChildren: true,            // 图片实际比例与库里不符时自动修正
      useTransform: true                // 用 transform 定位，走 GPU，滚动更顺
    });
    ro = new ResizeObserver(() => {
      if (!grid) return;
      const g = gapFor(container.clientWidth);
      if (g !== grid.gap) grid.gap = g;   // setter 自带重排调度
    });
    ro.observe(container);
    return grid;
  }

  return {
    /* 调用方先把 <figure> 们画进 container，再调 render() 排版 */
    render() {
      if (!container.children.length) {
        this.destroy();
        return;
      }
      const g = ensureGrid();
      g.syncElements();
      g.renderItems();
    },
    destroy() {
      if (ro) { ro.disconnect(); ro = null; }
      if (grid) { grid.destroy(); grid = null; }
    }
  };
}
