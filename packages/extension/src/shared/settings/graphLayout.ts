export type GraphLayoutMode = '2d' | '3d';

export const DEFAULT_GRAPH_SECTION_COLOR = '#60a5fa';
export const DEFAULT_GRAPH_SECTION_WIDTH = 280;
export const DEFAULT_GRAPH_SECTION_HEIGHT = 180;
export const GRAPH_SECTION_SELECTION_PADDING = 64;

export interface GraphLayoutCoordinate2D {
  x: number;
  y: number;
}

export interface GraphLayoutCoordinate3D extends GraphLayoutCoordinate2D {
  z: number;
}

export interface GraphLayoutPinnedNode {
  nodeId: string;
  twoDimensional?: GraphLayoutCoordinate2D;
  threeDimensional?: GraphLayoutCoordinate3D;
  updatedAt: string;
}

export interface GraphLayoutSection {
  id: string;
  label: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  collapsed: boolean;
  updatedAt: string;
}

export interface GraphLayoutOwnership {
  itemId: string;
  itemKind: 'node' | 'section';
  ownerSectionId: string | null;
  updatedAt: string;
}

export type GraphLayoutOwnershipUpdate = Omit<GraphLayoutOwnership, 'updatedAt'>;

export interface GraphLayoutSettings {
  pinnedNodes: Record<string, GraphLayoutPinnedNode>;
  sections: Record<string, GraphLayoutSection>;
  ownership: Record<string, GraphLayoutOwnership>;
}

export interface GraphLayoutSectionCreate {
  color?: string;
  height: number;
  label?: string;
  memberNodeIds?: string[];
  memberSectionIds?: string[];
  ownerSectionId?: string | null;
  width: number;
  x: number;
  y: number;
}

export function getDefaultGraphSectionSize(
  _graphViewportScale?: number | null,
): { height: number; width: number } {
  return {
    height: DEFAULT_GRAPH_SECTION_HEIGHT,
    width: DEFAULT_GRAPH_SECTION_WIDTH,
  };
}

export interface GraphLayoutSectionUpdate {
  collapsed?: boolean;
  color?: string;
  height?: number;
  label?: string;
  width?: number;
  x?: number;
  y?: number;
}

export function createDefaultGraphLayoutSettings(): GraphLayoutSettings {
  return {
    pinnedNodes: {},
    sections: {},
    ownership: {},
  };
}

export function getGraphLayoutPinCoordinate(
  pinnedNode: GraphLayoutPinnedNode | undefined,
  graphMode: GraphLayoutMode,
): GraphLayoutCoordinate2D | GraphLayoutCoordinate3D | undefined {
  return graphMode === '2d'
    ? pinnedNode?.twoDimensional
    : pinnedNode?.threeDimensional;
}

export function isGraphLayoutPointInsideSection(
  point: GraphLayoutCoordinate2D,
  section: Pick<GraphLayoutSection, 'height' | 'width' | 'x' | 'y'>,
): boolean {
  return point.x >= section.x
    && point.x <= section.x + section.width
    && point.y >= section.y
    && point.y <= section.y + section.height;
}

interface GraphLayoutSectionAncestorWalk {
  ancestorIds: string[];
  cycleDetected: boolean;
}

function getNestedOwnerSectionId(
  ownership: Readonly<Record<string, GraphLayoutOwnership>>,
  sectionId: string,
): string | null {
  const record = ownership[sectionId];
  return record?.itemKind === 'section' ? record.ownerSectionId : null;
}

function walkGraphLayoutSectionAncestors(
  ownership: Readonly<Record<string, GraphLayoutOwnership>>,
  sectionId: string,
): GraphLayoutSectionAncestorWalk {
  const ancestorIds: string[] = [];
  const visited = new Set<string>([sectionId]);
  let currentOwnerId = ownership[sectionId]?.ownerSectionId ?? null;

  while (currentOwnerId) {
    if (visited.has(currentOwnerId)) {
      return { ancestorIds, cycleDetected: true };
    }

    visited.add(currentOwnerId);
    ancestorIds.push(currentOwnerId);
    currentOwnerId = getNestedOwnerSectionId(ownership, currentOwnerId);
  }

  return { ancestorIds, cycleDetected: false };
}

function isExpandedGraphLayoutSection(section: GraphLayoutSection | undefined): section is GraphLayoutSection {
  return !!section && !section.collapsed;
}

export function isGraphLayoutSectionDescendant(
  ownership: Readonly<Record<string, GraphLayoutOwnership>>,
  sectionId: string,
  ancestorSectionId: string,
): boolean {
  const walk = walkGraphLayoutSectionAncestors(ownership, sectionId);
  return walk.ancestorIds.includes(ancestorSectionId);
}

export function isGraphLayoutItemOwnedBySection(
  ownership: Readonly<Record<string, GraphLayoutOwnership>>,
  itemId: string,
  ownerSectionId: string,
): boolean {
  const record = ownership[itemId];
  if (!record?.ownerSectionId) {
    return false;
  }

  return record.ownerSectionId === ownerSectionId
    || isGraphLayoutSectionDescendant(ownership, record.ownerSectionId, ownerSectionId);
}

export function getGraphLayoutSectionDepth(
  ownership: Readonly<Record<string, GraphLayoutOwnership>>,
  sectionId: string,
): number {
  return walkGraphLayoutSectionAncestors(ownership, sectionId).ancestorIds.length;
}

export function isGraphLayoutSectionVisible(
  sections: Readonly<Record<string, GraphLayoutSection>>,
  ownership: Readonly<Record<string, GraphLayoutOwnership>>,
  sectionId: string,
): boolean {
  const section = sections[sectionId];
  if (!isExpandedGraphLayoutSection(section)) {
    return false;
  }

  const walk = walkGraphLayoutSectionAncestors(ownership, sectionId);
  return !walk.cycleDetected
    && walk.ancestorIds.every(ancestorId => isExpandedGraphLayoutSection(sections[ancestorId]));
}

export function getGraphLayoutCollapsedRepresentative(
  layout: Pick<GraphLayoutSettings, 'ownership' | 'sections'>,
  itemId: string,
): string | null {
  const visited = new Set<string>([itemId]);
  let representative = layout.sections[itemId]?.collapsed ? itemId : null;
  let currentOwnerId = layout.ownership[itemId]?.ownerSectionId ?? null;

  while (currentOwnerId) {
    if (visited.has(currentOwnerId)) {
      return representative;
    }

    visited.add(currentOwnerId);
    if (layout.sections[currentOwnerId]?.collapsed) {
      representative = currentOwnerId;
    }

    currentOwnerId = layout.ownership[currentOwnerId]?.itemKind === 'section'
      ? layout.ownership[currentOwnerId].ownerSectionId
      : null;
  }

  return representative;
}

export function isGraphLayoutSectionNodeVisible(
  layout: Pick<GraphLayoutSettings, 'ownership' | 'sections'>,
  sectionId: string,
): boolean {
  const representative = getGraphLayoutCollapsedRepresentative(layout, sectionId);
  return representative === null || representative === sectionId;
}

export function isGraphLayoutItemHiddenByCollapsedSection(
  layout: Pick<GraphLayoutSettings, 'ownership' | 'sections'>,
  itemId: string,
): boolean {
  return getGraphLayoutCollapsedRepresentative(layout, itemId) !== null;
}

export function countGraphLayoutHiddenDescendants(
  layout: Pick<GraphLayoutSettings, 'ownership' | 'sections'>,
  sectionId: string,
  nodeIds: readonly string[],
): number {
  let count = 0;

  for (const nodeId of nodeIds) {
    if (getGraphLayoutCollapsedRepresentative(layout, nodeId) === sectionId) {
      count += 1;
    }
  }

  for (const descendantSectionId of Object.keys(layout.sections)) {
    if (
      descendantSectionId !== sectionId
      && getGraphLayoutCollapsedRepresentative(layout, descendantSectionId) === sectionId
    ) {
      count += 1;
    }
  }

  return count;
}

export function sortGraphLayoutSectionsForRendering(
  sections: readonly GraphLayoutSection[],
  ownership: Readonly<Record<string, GraphLayoutOwnership>>,
): GraphLayoutSection[] {
  return sections
    .map((section, index) => ({ index, section }))
    .sort((left, right) => {
      const depthDifference = getGraphLayoutSectionDepth(ownership, left.section.id)
        - getGraphLayoutSectionDepth(ownership, right.section.id);
      return depthDifference === 0
        ? left.index - right.index
        : depthDifference;
    })
    .map(entry => entry.section);
}

export function findDeepestGraphLayoutSectionAtPoint(
  layout: Pick<GraphLayoutSettings, 'ownership' | 'sections'>,
  point: GraphLayoutCoordinate2D,
): string | null {
  let selectedSectionId: string | null = null;
  let selectedDepth = -1;
  let selectedArea = Number.POSITIVE_INFINITY;

  for (const section of Object.values(layout.sections)) {
    if (
      !isGraphLayoutSectionVisible(layout.sections, layout.ownership, section.id)
      || !isGraphLayoutPointInsideSection(point, section)
    ) {
      continue;
    }

    const depth = getGraphLayoutSectionDepth(layout.ownership, section.id);
    const area = section.width * section.height;
    if (depth > selectedDepth || (depth === selectedDepth && area < selectedArea)) {
      selectedSectionId = section.id;
      selectedDepth = depth;
      selectedArea = area;
    }
  }

  return selectedSectionId;
}
