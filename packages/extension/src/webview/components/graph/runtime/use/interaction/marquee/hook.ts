import {
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import {
  getMarqueeBounds,
  type GraphMarqueeSelectionState,
} from '../../../../marqueeSelection/model';
import { selectMarqueeNodes } from './selection';
import {
  canStartMarqueeSelection,
  createMarqueeDragState,
  getLocalMarqueePoint,
  type GraphMarqueeSelectionRuntime,
  type GraphMarqueeSelectionRuntimeOptions,
  type MarqueeDragState,
  updateMarqueeDragState,
} from './state';

export function useGraphMarqueeSelectionRuntime(
  options: GraphMarqueeSelectionRuntimeOptions,
): GraphMarqueeSelectionRuntime {
  const marqueeDragRef = useRef<MarqueeDragState | null>(null);
  const [marqueeSelection, setMarqueeSelection] = useState<GraphMarqueeSelectionState | null>(null);

  function clearMarqueeSelection(): void {
    marqueeDragRef.current = null;
    setMarqueeSelection(null);
  }

  function handleMouseDownCapture(event: ReactMouseEvent<HTMLDivElement>): void {
    if (!canStartMarqueeSelection(event, options.hoveredNodeRef.current)) {
      clearMarqueeSelection();
      return;
    }

    const point = getLocalMarqueePoint(event, options.containerRef.current);
    marqueeDragRef.current = createMarqueeDragState(point, event.shiftKey);
  }

  function handleMouseMoveCapture(event: ReactMouseEvent<HTMLDivElement>): void {
    const drag = marqueeDragRef.current;
    if (!drag) {
      return;
    }

    const current = getLocalMarqueePoint(event, options.containerRef.current);
    updateMarqueeDragState(drag, current);

    if (drag.selecting) {
      event.preventDefault();
      setMarqueeSelection({ bounds: getMarqueeBounds(drag.start, current) });
    }
  }

  function handleMouseUpCapture(event: ReactMouseEvent<HTMLDivElement>): void {
    if (event.button !== 0) {
      return;
    }

    const drag = marqueeDragRef.current;
    clearMarqueeSelection();

    if (!drag?.selecting) {
      return;
    }

    event.preventDefault();
    selectMarqueeNodes(drag, options);
  }

  return {
    clearMarqueeSelection,
    handleMouseDownCapture,
    handleMouseMoveCapture,
    handleMouseUpCapture,
    marqueeSelection,
  };
}
