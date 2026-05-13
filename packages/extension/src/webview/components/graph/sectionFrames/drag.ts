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

export type SectionFrameDragEndHandler = (
  this: void,
  sectionId: string,
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
    const width = drag.nodePosition.sectionWidth ?? drag.section.width;
    const height = drag.nodePosition.sectionHeight ?? drag.section.height;
    if (typeof x === 'number' && Number.isFinite(x)) {
      const centerX = x + (width / 2);
      drag.nodePosition.x = centerX;
      drag.nodePosition.fx = centerX;
      drag.nodePosition.vx = 0;
    }
    if (typeof y === 'number' && Number.isFinite(y)) {
      const centerY = y + (height / 2);
      drag.nodePosition.y = centerY;
      drag.nodePosition.fy = centerY;
      drag.nodePosition.vy = 0;
    }
    return;
  }

  const { height, width } = update.updates;
  const nextHeight = typeof height === 'number' && Number.isFinite(height)
    ? height
    : drag.nodePosition.sectionHeight ?? drag.section.height;
  const nextWidth = typeof width === 'number' && Number.isFinite(width)
    ? width
    : drag.nodePosition.sectionWidth ?? drag.section.width;
  if (typeof height === 'number' && Number.isFinite(height)) {
    drag.nodePosition.sectionHeight = nextHeight;
  }
  if (typeof width === 'number' && Number.isFinite(width)) {
    drag.nodePosition.sectionWidth = nextWidth;
  }
  const nextX = typeof update.updates.x === 'number' && Number.isFinite(update.updates.x)
    ? update.updates.x
    : drag.section.x;
  const nextY = typeof update.updates.y === 'number' && Number.isFinite(update.updates.y)
    ? update.updates.y
    : drag.section.y;
  const centerX = nextX + (nextWidth / 2);
  const centerY = nextY + (nextHeight / 2);
  drag.nodePosition.x = centerX;
  drag.nodePosition.y = centerY;
  drag.nodePosition.fx = centerX;
  drag.nodePosition.fy = centerY;
  drag.nodePosition.vx = 0;
  drag.nodePosition.vy = 0;
}

function releaseLiveNodePosition(drag: SectionFrameDragState): void {
  if (!drag.nodePosition) {
    return;
  }

  drag.nodePosition.isDragging = false;
  if (drag.nodePosition.isPinned) {
    return;
  }

  drag.nodePosition.fx = undefined;
  drag.nodePosition.fy = undefined;
}

function markLiveNodeDragging(drag: SectionFrameDragState): void {
  if (drag.nodePosition) {
    drag.nodePosition.isDragging = true;
  }
}

function wakeSectionFramePhysics(graph: SectionFrameGraph | undefined): void {
  graph?.resumeAnimation?.();
  graph?.d3ReheatSimulation?.();
}

function applyLiveDragUpdate(
  graph: SectionFrameGraph | undefined,
  drag: SectionFrameDragState,
  event: Pick<MouseEvent, 'clientX' | 'clientY'>,
): SectionFrameDragUpdate {
  const update = getSectionFrameDragUpdate(graph, drag, event);
  applyLiveNodePosition(drag, update);
  wakeSectionFramePhysics(graph);
  return update;
}

export function beginSectionFrameWindowDrag(
  graph: SectionFrameGraph | undefined,
  drag: SectionFrameDragState,
  onUpdateSection: SectionFrameUpdateHandler,
  onDragEnd?: SectionFrameDragEndHandler,
): void {
  markLiveNodeDragging(drag);
  wakeSectionFramePhysics(graph);

  function handleMouseMove(event: MouseEvent): void {
    applyLiveDragUpdate(graph, drag, event);
  }

  function handleMouseUp(event: MouseEvent): void {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    const update = applyLiveDragUpdate(graph, drag, event);
    releaseLiveNodePosition(drag);
    onUpdateSection(update.sectionId, update.updates);
    if (drag.type === 'move') {
      onDragEnd?.(update.sectionId);
    }
  }

  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
}

export function isSectionFrameControl(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest('[data-graph-section-control="true"]');
}
