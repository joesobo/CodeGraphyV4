import { isPlainObject } from '../store/model/plainObject';
import {
  createDefaultGraphLayoutSettings,
  type GraphLayoutCoordinate2D,
  type GraphLayoutCoordinate3D,
  type GraphLayoutMode,
  type GraphLayoutOwnership,
  type GraphLayoutPinnedNode,
  type GraphLayoutSection,
  type GraphLayoutSettings,
} from '../../../shared/settings/graphLayout';

export { createDefaultGraphLayoutSettings };
export type {
  GraphLayoutCoordinate2D,
  GraphLayoutCoordinate3D,
  GraphLayoutMode,
  GraphLayoutOwnership,
  GraphLayoutPinnedNode,
  GraphLayoutSection,
  GraphLayoutSettings,
};

function readRequiredString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0
    ? value
    : undefined;
}

function readFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

function readPositiveNumber(value: unknown): number | undefined {
  const numberValue = readFiniteNumber(value);
  return numberValue !== undefined && numberValue > 0
    ? numberValue
    : undefined;
}

function readCoordinate2D(value: unknown): GraphLayoutCoordinate2D | undefined {
  if (!isPlainObject(value)) {
    return undefined;
  }

  const x = readFiniteNumber(value.x);
  const y = readFiniteNumber(value.y);
  if (x === undefined || y === undefined) {
    return undefined;
  }

  return { x, y };
}

function readCoordinate3D(value: unknown): GraphLayoutCoordinate3D | undefined {
  const coordinate2D = readCoordinate2D(value);
  if (!coordinate2D || !isPlainObject(value)) {
    return undefined;
  }

  const z = readFiniteNumber(value.z);
  if (z === undefined) {
    return undefined;
  }

  return { ...coordinate2D, z };
}

function normalizePinnedNode(
  key: string,
  value: unknown,
): GraphLayoutPinnedNode | undefined {
  if (!isPlainObject(value)) {
    return undefined;
  }

  const nodeId = readRequiredString(value.nodeId);
  const updatedAt = readRequiredString(value.updatedAt);
  if (nodeId !== key || !updatedAt) {
    return undefined;
  }

  const twoDimensional = readCoordinate2D(value.twoDimensional);
  const threeDimensional = readCoordinate3D(value.threeDimensional);
  if (!twoDimensional && !threeDimensional) {
    return undefined;
  }

  return {
    nodeId,
    ...(twoDimensional ? { twoDimensional } : {}),
    ...(threeDimensional ? { threeDimensional } : {}),
    updatedAt,
  };
}

function normalizePinnedNodes(value: unknown): Record<string, GraphLayoutPinnedNode> {
  if (!isPlainObject(value)) {
    return {};
  }

  const pinnedNodes: Record<string, GraphLayoutPinnedNode> = {};
  for (const [key, entryValue] of Object.entries(value)) {
    const pinnedNode = normalizePinnedNode(key, entryValue);
    if (pinnedNode) {
      pinnedNodes[key] = pinnedNode;
    }
  }

  return pinnedNodes;
}

function normalizeSection(
  key: string,
  value: unknown,
): GraphLayoutSection | undefined {
  if (!isPlainObject(value)) {
    return undefined;
  }

  const id = readRequiredString(value.id);
  const label = readRequiredString(value.label);
  const color = readRequiredString(value.color);
  const x = readFiniteNumber(value.x);
  const y = readFiniteNumber(value.y);
  const width = readPositiveNumber(value.width);
  const height = readPositiveNumber(value.height);
  const updatedAt = readRequiredString(value.updatedAt);

  if (
    id !== key
    || !label
    || !color
    || x === undefined
    || y === undefined
    || width === undefined
    || height === undefined
    || typeof value.collapsed !== 'boolean'
    || !updatedAt
  ) {
    return undefined;
  }

  return {
    id,
    label,
    color,
    x,
    y,
    width,
    height,
    collapsed: value.collapsed,
    updatedAt,
  };
}

function normalizeSections(value: unknown): Record<string, GraphLayoutSection> {
  if (!isPlainObject(value)) {
    return {};
  }

  const sections: Record<string, GraphLayoutSection> = {};
  for (const [key, entryValue] of Object.entries(value)) {
    const section = normalizeSection(key, entryValue);
    if (section) {
      sections[key] = section;
    }
  }

  return sections;
}

function normalizeOwnerSectionId(
  itemId: string,
  itemKind: GraphLayoutOwnership['itemKind'],
  ownerSectionId: unknown,
  sections: Record<string, GraphLayoutSection>,
): string | null | undefined {
  if (ownerSectionId === null) {
    return null;
  }

  if (typeof ownerSectionId !== 'string' || !(ownerSectionId in sections)) {
    return undefined;
  }

  if (itemKind === 'section' && ownerSectionId === itemId) {
    return undefined;
  }

  return ownerSectionId;
}

function normalizeOwnershipRecord(
  key: string,
  value: unknown,
  sections: Record<string, GraphLayoutSection>,
): GraphLayoutOwnership | undefined {
  if (!isPlainObject(value)) {
    return undefined;
  }

  const itemId = readRequiredString(value.itemId);
  const updatedAt = readRequiredString(value.updatedAt);
  if (itemId !== key || !updatedAt) {
    return undefined;
  }

  if (value.itemKind !== 'node' && value.itemKind !== 'section') {
    return undefined;
  }

  if (value.itemKind === 'section' && !(itemId in sections)) {
    return undefined;
  }

  const ownerSectionId = normalizeOwnerSectionId(
    itemId,
    value.itemKind,
    value.ownerSectionId,
    sections,
  );
  if (ownerSectionId === undefined) {
    return undefined;
  }

  return {
    itemId,
    itemKind: value.itemKind,
    ownerSectionId,
    updatedAt,
  };
}

export function wouldCreateGraphLayoutOwnershipCycle(
  ownership: Readonly<Record<string, GraphLayoutOwnership>>,
  sectionId: string,
  ownerSectionId: string | null,
): boolean {
  let currentOwnerId = ownerSectionId;
  const visited = new Set<string>([sectionId]);

  while (currentOwnerId) {
    if (visited.has(currentOwnerId)) {
      return true;
    }

    visited.add(currentOwnerId);
    const ownerRecord = ownership[currentOwnerId];
    currentOwnerId = ownerRecord?.itemKind === 'section'
      ? ownerRecord.ownerSectionId
      : null;
  }

  return false;
}

function normalizeOwnership(
  value: unknown,
  sections: Record<string, GraphLayoutSection>,
): Record<string, GraphLayoutOwnership> {
  if (!isPlainObject(value)) {
    return {};
  }

  const ownership: Record<string, GraphLayoutOwnership> = {};
  for (const [key, entryValue] of Object.entries(value)) {
    const record = normalizeOwnershipRecord(key, entryValue, sections);
    if (!record) {
      continue;
    }

    if (
      record.itemKind === 'section'
      && wouldCreateGraphLayoutOwnershipCycle(
        ownership,
        record.itemId,
        record.ownerSectionId,
      )
    ) {
      continue;
    }

    ownership[key] = record;
  }

  return ownership;
}

export function normalizeGraphLayoutSettings(value: unknown): GraphLayoutSettings {
  if (!isPlainObject(value)) {
    return createDefaultGraphLayoutSettings();
  }

  const sections = normalizeSections(value.sections);

  return {
    pinnedNodes: normalizePinnedNodes(value.pinnedNodes),
    sections,
    ownership: normalizeOwnership(value.ownership, sections),
  };
}

export function assignGraphLayoutOwner(
  layout: GraphLayoutSettings,
  ownership: GraphLayoutOwnership,
): GraphLayoutSettings {
  const normalizedRecord = normalizeOwnershipRecord(
    ownership.itemId,
    ownership,
    layout.sections,
  );
  if (!normalizedRecord) {
    throw new Error('Graph Section ownership record is invalid.');
  }

  if (
    normalizedRecord.itemKind === 'section'
    && wouldCreateGraphLayoutOwnershipCycle(
      layout.ownership,
      normalizedRecord.itemId,
      normalizedRecord.ownerSectionId,
    )
  ) {
    throw new Error('Graph Section ownership cannot create a cycle.');
  }

  return {
    ...layout,
    ownership: {
      ...layout.ownership,
      [normalizedRecord.itemId]: normalizedRecord,
    },
  };
}

export interface GraphLayoutNodePinUpdate {
  graphMode: GraphLayoutMode;
  nodeId: string;
  position: GraphLayoutCoordinate2D | GraphLayoutCoordinate3D;
  updatedAt: string;
}

function isCoordinate3D(
  position: GraphLayoutCoordinate2D | GraphLayoutCoordinate3D,
): position is GraphLayoutCoordinate3D {
  return 'z' in position;
}

export function setGraphLayoutNodePin(
  layout: GraphLayoutSettings,
  update: GraphLayoutNodePinUpdate,
): GraphLayoutSettings {
  const existing = layout.pinnedNodes[update.nodeId];
  const nextPinnedNode: GraphLayoutPinnedNode = {
    nodeId: update.nodeId,
    twoDimensional: update.graphMode === '2d'
      ? { x: update.position.x, y: update.position.y }
      : existing?.twoDimensional,
    threeDimensional: update.graphMode === '3d' && isCoordinate3D(update.position)
      ? { x: update.position.x, y: update.position.y, z: update.position.z }
      : existing?.threeDimensional,
    updatedAt: update.updatedAt,
  };

  return normalizeGraphLayoutSettings({
    ...layout,
    pinnedNodes: {
      ...layout.pinnedNodes,
      [update.nodeId]: nextPinnedNode,
    },
  });
}

export function clearGraphLayoutNodePin(
  layout: GraphLayoutSettings,
  nodeId: string,
  graphMode: GraphLayoutMode,
): GraphLayoutSettings {
  const existing = layout.pinnedNodes[nodeId];
  if (!existing) {
    return layout;
  }

  const nextPinnedNodes = { ...layout.pinnedNodes };
  const nextPinnedNode: GraphLayoutPinnedNode = {
    ...existing,
    ...(graphMode === '2d' ? { twoDimensional: undefined } : {}),
    ...(graphMode === '3d' ? { threeDimensional: undefined } : {}),
  };

  if (!nextPinnedNode.twoDimensional && !nextPinnedNode.threeDimensional) {
    delete nextPinnedNodes[nodeId];
  } else {
    nextPinnedNodes[nodeId] = nextPinnedNode;
  }

  return normalizeGraphLayoutSettings({
    ...layout,
    pinnedNodes: nextPinnedNodes,
  });
}
