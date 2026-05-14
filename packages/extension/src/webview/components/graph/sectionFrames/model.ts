import {
  isGraphLayoutSectionVisible,
  sortGraphLayoutSectionsForRendering,
  type GraphLayoutOwnership,
  type GraphLayoutSection,
  type GraphLayoutSectionUpdate,
} from '../../../../shared/settings/graphLayout';

export interface SectionFrameGraph {
  d3ReheatSimulation?(): void;
  graph2ScreenCoords?(x: number, y: number): { x: number; y: number };
  resumeAnimation?(): void;
  screen2GraphCoords?(x: number, y: number): { x: number; y: number };
}

export interface SectionFrameRect {
  height: number;
  left: number;
  scale: number;
  top: number;
  width: number;
}

export interface SectionFrameNodePosition {
  fx?: number;
  fy?: number;
  id: string;
  isDragging?: boolean;
  isPinned?: boolean;
  sectionHeight?: number;
  sectionWidth?: number;
  vx?: number;
  vy?: number;
  x?: number;
  y?: number;
}

export type SectionFrameResizeCorner = 'northwest' | 'northeast' | 'southwest' | 'southeast';
export type SectionFrameDragType = 'move' | `resize:${SectionFrameResizeCorner}`;

export interface SectionFrameDragState {
  clientX: number;
  clientY: number;
  nodePosition?: SectionFrameNodePosition;
  section: GraphLayoutSection;
  type: SectionFrameDragType;
}

export interface SectionFrameDragUpdate {
  sectionId: string;
  updates: GraphLayoutSectionUpdate;
}

export const SECTION_FRAME_HEADER_HEIGHT = 28;

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

  const height = readFiniteNumber(nodePosition.sectionHeight) ?? section.height;
  const width = readFiniteNumber(nodePosition.sectionWidth) ?? section.width;
  const centerX = readFiniteNumber(nodePosition.x);
  const centerY = readFiniteNumber(nodePosition.y);
  return {
    ...section,
    height,
    width,
    x: centerX === undefined ? section.x : centerX - (width / 2),
    y: centerY === undefined ? section.y : centerY - (height / 2),
  };
}

export function getSectionFrameRect(
  graph: SectionFrameGraph | undefined,
  section: GraphLayoutSection,
): SectionFrameRect {
  const topLeft = graphToScreen(graph, section.x, section.y);
  const bottomRight = graphToScreen(graph, section.x + section.width, section.y + section.height);
  const height = Math.abs(bottomRight.y - topLeft.y);
  const width = Math.abs(bottomRight.x - topLeft.x);
  return {
    height,
    left: Math.min(topLeft.x, bottomRight.x),
    scale: height / Math.max(1, Math.abs(section.height)),
    top: Math.min(topLeft.y, bottomRight.y),
    width,
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

  if (drag.type === 'resize:southeast') {
    return {
      sectionId: drag.section.id,
      updates: {
        height: Math.max(MIN_SECTION_SIZE, drag.section.height + delta.y),
        width: Math.max(MIN_SECTION_SIZE, drag.section.width + delta.x),
      },
    };
  }

  if (drag.type === 'resize:southwest') {
    const nextWidth = Math.max(MIN_SECTION_SIZE, drag.section.width - delta.x);
    return {
      sectionId: drag.section.id,
      updates: {
        height: Math.max(MIN_SECTION_SIZE, drag.section.height + delta.y),
        width: nextWidth,
        x: drag.section.x + drag.section.width - nextWidth,
      },
    };
  }

  if (drag.type === 'resize:northeast') {
    const nextHeight = Math.max(MIN_SECTION_SIZE, drag.section.height - delta.y);
    return {
      sectionId: drag.section.id,
      updates: {
        height: nextHeight,
        width: Math.max(MIN_SECTION_SIZE, drag.section.width + delta.x),
        y: drag.section.y + drag.section.height - nextHeight,
      },
    };
  }

  if (drag.type === 'resize:northwest') {
    const nextHeight = Math.max(MIN_SECTION_SIZE, drag.section.height - delta.y);
    const nextWidth = Math.max(MIN_SECTION_SIZE, drag.section.width - delta.x);
    return {
      sectionId: drag.section.id,
      updates: {
        height: nextHeight,
        width: nextWidth,
        x: drag.section.x + drag.section.width - nextWidth,
        y: drag.section.y + drag.section.height - nextHeight,
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
