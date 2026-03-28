import type { MutableRefObject } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { bindTimelineDragListeners } from '../../../src/webview/components/timeline/dragListeners';

function createRef<T>(current: T): MutableRefObject<T> {
  return { current } as MutableRefObject<T>;
}

describe('timeline/dragListeners', () => {
  it('forwards mouse movement while dragging is active', () => {
    const isDraggingRef = createRef(true);
    const onDrag = vi.fn();
    const removeListeners = bindTimelineDragListeners({ isDraggingRef, onDrag });

    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 140 }));

    expect(onDrag).toHaveBeenCalledWith(140);

    removeListeners();
  });

  it('ends dragging on mouseup and ignores later movement', () => {
    const isDraggingRef = createRef(true);
    const onDrag = vi.fn();
    const removeListeners = bindTimelineDragListeners({ isDraggingRef, onDrag });

    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 80 }));
    window.dispatchEvent(new MouseEvent('mouseup'));
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 200 }));

    expect(isDraggingRef.current).toBe(false);
    expect(onDrag).toHaveBeenCalledTimes(1);
    expect(onDrag).toHaveBeenCalledWith(80);

    removeListeners();
  });

  it('removes the window listeners when unbound', () => {
    const isDraggingRef = createRef(true);
    const onDrag = vi.fn();
    const removeListeners = bindTimelineDragListeners({ isDraggingRef, onDrag });

    removeListeners();
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 220 }));
    window.dispatchEvent(new MouseEvent('mouseup'));

    expect(onDrag).not.toHaveBeenCalled();
    expect(isDraggingRef.current).toBe(true);
  });
});
