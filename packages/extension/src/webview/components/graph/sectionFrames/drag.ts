import type { GraphLayoutSectionUpdate } from '../../../../shared/settings/graphLayout';
import {
  getSectionFrameDragUpdate,
  type SectionFrameDragState,
  type SectionFrameGraph,
} from './model';

export type SectionFrameUpdateHandler = (
  this: void,
  sectionId: string,
  updates: GraphLayoutSectionUpdate,
) => void;

export function beginSectionFrameWindowDrag(
  graph: SectionFrameGraph | undefined,
  drag: SectionFrameDragState,
  onUpdateSection: SectionFrameUpdateHandler,
): void {
  function handleMouseUp(event: MouseEvent): void {
    window.removeEventListener('mouseup', handleMouseUp);
    const update = getSectionFrameDragUpdate(graph, drag, event);
    onUpdateSection(update.sectionId, update.updates);
  }

  window.addEventListener('mouseup', handleMouseUp);
}

export function isSectionFrameControl(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest('[data-graph-section-control="true"]');
}
