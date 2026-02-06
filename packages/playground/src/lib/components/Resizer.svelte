<script>
  /**
   * Reusable resize handle component
   * @param {'horizontal' | 'vertical'} direction - Resize direction
   * @param {(e: MouseEvent) => void} onResize - Called during drag with mouse event
   * @param {() => void} [onResizeStart] - Called when drag starts
   * @param {() => void} [onResizeEnd] - Called when drag ends
   */
  const { direction = 'vertical', onResize, onResizeStart, onResizeEnd } = $props();

  let isDragging = $state(false);

  function handleMouseDown(e) {
    e.preventDefault();
    isDragging = true;

    // Set body cursor based on direction
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';

    onResizeStart?.();

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  function handleMouseMove(e) {
    if (!isDragging) return;
    onResize?.(e);
  }

  function handleMouseUp() {
    isDragging = false;

    // Reset body styles
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    onResizeEnd?.();

    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }
</script>

<div
  class="resizer resizer-{direction}"
  class:dragging={isDragging}
  onmousedown={handleMouseDown}
  role="separator"
  aria-orientation={direction === 'horizontal' ? 'vertical' : 'horizontal'}
>
  <div class="resizer-handle"></div>
</div>

<style>
  .resizer {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.15s;
  }

  .resizer:hover,
  .resizer.dragging {
    background-color: color-mix(in srgb, var(--color-accent) 10%, transparent);
  }

  .resizer-handle {
    background-color: var(--color-border);
    border-radius: 2px;
    transition: background-color 0.15s;
  }

  .resizer:hover .resizer-handle,
  .resizer.dragging .resizer-handle {
    background-color: var(--color-accent);
  }

  /* Vertical resizer (horizontal line, resizes vertically) */
  .resizer-vertical {
    height: 12px;
    cursor: row-resize;
  }

  .resizer-vertical .resizer-handle {
    width: 48px;
    height: 2px;
  }

  /* Horizontal resizer (vertical line, resizes horizontally) */
  .resizer-horizontal {
    width: 12px;
    cursor: col-resize;
  }

  .resizer-horizontal .resizer-handle {
    width: 2px;
    height: 48px;
  }
</style>
