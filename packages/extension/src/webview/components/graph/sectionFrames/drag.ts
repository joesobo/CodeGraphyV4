import type { GraphLayoutSectionUpdate } from '../../../../shared/settings/graphLayout';
import type { LegendIconImport } from '../../../../shared/protocol/webviewToExtension';
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
  iconImports?: LegendIconImport[],
) => void;

export type SectionFrameDragEndHandler = (
  this: void,
  sectionId: string,
) => void;

function readFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function setLiveNodeCenter(
  drag: SectionFrameDragState,
  x: number,
  y: number,
): void {
  const nodePosition = drag.nodePosition;
  if (!nodePosition) {
    return;
  }

  nodePosition.x = x;
  nodePosition.y = y;
  nodePosition.fx = x;
  nodePosition.fy = y;
  nodePosition.vx = 0;
  nodePosition.vy = 0;
}

function applyLiveMoveNodePosition(
  drag: SectionFrameDragState,
  update: SectionFrameDragUpdate,
): void {
  const { x, y } = update.updates;
  const width = drag.nodePosition?.sectionWidth ?? drag.section.width;
  const height = drag.nodePosition?.sectionHeight ?? drag.section.height;
  const centerX = readFiniteNumber(x);
  const centerY = readFiniteNumber(y);

  if (centerX !== undefined) {
    drag.nodePosition!.x = centerX + (width / 2);
    drag.nodePosition!.fx = drag.nodePosition!.x;
    drag.nodePosition!.vx = 0;
  }
  if (centerY !== undefined) {
    drag.nodePosition!.y = centerY + (height / 2);
    drag.nodePosition!.fy = drag.nodePosition!.y;
    drag.nodePosition!.vy = 0;
  }
}

function getLiveResizeDimension(
  currentValue: unknown,
  updateValue: unknown,
  fallback: number,
): number {
  return readFiniteNumber(updateValue) ?? readFiniteNumber(currentValue) ?? fallback;
}

function applyLiveResizeDimensions(
  drag: SectionFrameDragState,
  update: SectionFrameDragUpdate,
): { height: number; width: number } {
  const nextHeight = getLiveResizeDimension(
    drag.nodePosition?.sectionHeight,
    update.updates.height,
    drag.section.height,
  );
  const nextWidth = getLiveResizeDimension(
    drag.nodePosition?.sectionWidth,
    update.updates.width,
    drag.section.width,
  );

  if (readFiniteNumber(update.updates.height) !== undefined) {
    drag.nodePosition!.sectionHeight = nextHeight;
  }
  if (readFiniteNumber(update.updates.width) !== undefined) {
    drag.nodePosition!.sectionWidth = nextWidth;
  }

  return { height: nextHeight, width: nextWidth };
}

function applyLiveResizeNodePosition(
  drag: SectionFrameDragState,
  update: SectionFrameDragUpdate,
): void {
  const nextSize = applyLiveResizeDimensions(drag, update);
  const nextX = readFiniteNumber(update.updates.x) ?? drag.section.x;
  const nextY = readFiniteNumber(update.updates.y) ?? drag.section.y;

  setLiveNodeCenter(
    drag,
    nextX + (nextSize.width / 2),
    nextY + (nextSize.height / 2),
  );
}

function applyLiveNodePosition(
  drag: SectionFrameDragState,
  update: SectionFrameDragUpdate,
): void {
  if (!drag.nodePosition) {
    return;
  }

  if (drag.type === 'move') {
    applyLiveMoveNodePosition(drag, update);
    return;
  }

  applyLiveResizeNodePosition(drag, update);
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
