import type { GraphLayoutSectionUpdate } from '../../../../shared/settings/graphLayout';
import {
  getSectionFrameDragUpdate,
  type SectionFrameDragUpdate,
  type SectionFrameDragState,
  type SectionFrameGraph,
} from './model';

export type SectionFrameUpdateHandler = (
  this: void,
  sectionId: string,
  updates: GraphLayoutSectionUpdate,
) => void;

function applyLiveNodePosition(
  drag: SectionFrameDragState,
  update: SectionFrameDragUpdate,
): void {
  if (!drag.nodePosition) {
    return;
  }

  if (drag.type === 'move') {
    const { x, y } = update.updates;
    if (typeof x === 'number' && Number.isFinite(x)) {
      drag.nodePosition.x = x;
      drag.nodePosition.fx = x;
      drag.nodePosition.vx = 0;
    }
    if (typeof y === 'number' && Number.isFinite(y)) {
      drag.nodePosition.y = y;
      drag.nodePosition.fy = y;
      drag.nodePosition.vy = 0;
    }
    return;
  }

  const { height, width } = update.updates;
  if (typeof height === 'number' && Number.isFinite(height)) {
    drag.nodePosition.sectionHeight = height;
  }
  if (typeof width === 'number' && Number.isFinite(width)) {
    drag.nodePosition.sectionWidth = width;
  }
}

function releaseLiveNodePosition(drag: SectionFrameDragState): void {
  if (!drag.nodePosition || drag.nodePosition.isPinned) {
    return;
  }

  drag.nodePosition.fx = undefined;
  drag.nodePosition.fy = undefined;
}

function applyLiveDragUpdate(
  graph: SectionFrameGraph | undefined,
  drag: SectionFrameDragState,
  event: Pick<MouseEvent, 'clientX' | 'clientY'>,
): SectionFrameDragUpdate {
  const update = getSectionFrameDragUpdate(graph, drag, event);
  applyLiveNodePosition(drag, update);
  return update;
}

export function beginSectionFrameWindowDrag(
  graph: SectionFrameGraph | undefined,
  drag: SectionFrameDragState,
  onUpdateSection: SectionFrameUpdateHandler,
): void {
  function handleMouseMove(event: MouseEvent): void {
    applyLiveDragUpdate(graph, drag, event);
  }

  function handleMouseUp(event: MouseEvent): void {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    const update = applyLiveDragUpdate(graph, drag, event);
    releaseLiveNodePosition(drag);
    onUpdateSection(update.sectionId, update.updates);
  }

  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
}

export function isSectionFrameControl(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest('[data-graph-section-control="true"]');
}
