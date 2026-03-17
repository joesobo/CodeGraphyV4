import type { MutableRefObject } from 'react';

export function bindTimelineDragListeners(options: {
  isDraggingRef: MutableRefObject<boolean>;
  onDrag: (clientX: number) => void;
}): () => void {
  const { isDraggingRef, onDrag } = options;

  const handleMouseMove = (event: MouseEvent) => {
    if (isDraggingRef.current) {
      onDrag(event.clientX);
    }
  };
  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);

  return () => {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };
}
