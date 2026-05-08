import {
  isGraphLayoutSectionVisible,
  sortGraphLayoutSectionsForRendering,
  type GraphLayoutOwnership,
  type GraphLayoutSection,
  type GraphLayoutSectionUpdate,
} from '../../../../shared/settings/graphLayout';

export interface SectionFrameGraph {
  graph2ScreenCoords?(x: number, y: number): { x: number; y: number };
  screen2GraphCoords?(x: number, y: number): { x: number; y: number };
}

export interface SectionFrameRect {
  height: number;
  left: number;
  top: number;
  width: number;
}

export interface SectionFrameNodePosition {
  id: string;
  sectionHeight?: number;
  sectionWidth?: number;
  x?: number;
  y?: number;
}

export type SectionFrameDragType = 'move' | 'resize';

export interface SectionFrameDragState {
  clientX: number;
  clientY: number;
  section: GraphLayoutSection;
  type: SectionFrameDragType;
}

export interface SectionFrameDragUpdate {
  sectionId: string;
  updates: GraphLayoutSectionUpdate;
}

const MIN_SECTION_SIZE = 80;

function graphToScreen(
  graph: SectionFrameGraph | undefined,
  x: number,
  y: number,
): { x: number; y: number } {
  return graph?.graph2ScreenCoords?.(x, y) ?? { x, y };
}

function screenToGraph(
  graph: SectionFrameGraph | undefined,
  x: number,
  y: number,
): { x: number; y: number } {
  return graph?.screen2GraphCoords?.(x, y) ?? { x, y };
}

function readFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function getSectionFrameDisplaySection(
  section: GraphLayoutSection,
  nodePosition: SectionFrameNodePosition | undefined,
): GraphLayoutSection {
  if (!nodePosition) {
    return section;
  }

  return {
    ...section,
    height: readFiniteNumber(nodePosition.sectionHeight) ?? section.height,
    width: readFiniteNumber(nodePosition.sectionWidth) ?? section.width,
    x: readFiniteNumber(nodePosition.x) ?? section.x,
    y: readFiniteNumber(nodePosition.y) ?? section.y,
  };
}

export function getSectionFrameRect(
  graph: SectionFrameGraph | undefined,
  section: GraphLayoutSection,
): SectionFrameRect {
  const topLeft = graphToScreen(graph, section.x, section.y);
  const bottomRight = graphToScreen(graph, section.x + section.width, section.y + section.height);
  return {
    height: Math.abs(bottomRight.y - topLeft.y),
    left: Math.min(topLeft.x, bottomRight.x),
    top: Math.min(topLeft.y, bottomRight.y),
    width: Math.abs(bottomRight.x - topLeft.x),
  };
}

function getDragDelta(
  graph: SectionFrameGraph | undefined,
  drag: SectionFrameDragState,
  event: Pick<MouseEvent, 'clientX' | 'clientY'>,
): { x: number; y: number } {
  const start = screenToGraph(graph, drag.clientX, drag.clientY);
  const current = screenToGraph(graph, event.clientX, event.clientY);
  return {
    x: current.x - start.x,
    y: current.y - start.y,
  };
}

export function getSectionFrameDragUpdate(
  graph: SectionFrameGraph | undefined,
  drag: SectionFrameDragState,
  event: Pick<MouseEvent, 'clientX' | 'clientY'>,
): SectionFrameDragUpdate {
  const delta = getDragDelta(graph, drag, event);

  if (drag.type === 'move') {
    return {
      sectionId: drag.section.id,
      updates: {
        x: drag.section.x + delta.x,
        y: drag.section.y + delta.y,
      },
    };
  }

  if (drag.type === 'resize') {
    return {
      sectionId: drag.section.id,
      updates: {
        height: Math.max(MIN_SECTION_SIZE, drag.section.height + delta.y),
        width: Math.max(MIN_SECTION_SIZE, drag.section.width + delta.x),
      },
    };
  }

  throw new Error('Unknown Section Frame drag type.');
}

function createSectionMap(
  sections: readonly GraphLayoutSection[],
): Record<string, GraphLayoutSection> {
  return Object.fromEntries(sections.map(section => [section.id, section]));
}

export function getVisibleSectionFrames(
  sections: readonly GraphLayoutSection[],
  ownership: Readonly<Record<string, GraphLayoutOwnership>>,
): GraphLayoutSection[] {
  const sectionMap = createSectionMap(sections);
  return sortGraphLayoutSectionsForRendering(sections, ownership)
    .filter(section => isGraphLayoutSectionVisible(sectionMap, ownership, section.id));
}
