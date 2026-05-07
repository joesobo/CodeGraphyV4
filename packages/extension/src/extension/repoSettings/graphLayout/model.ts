import { isPlainObject } from '../store/model/plainObject';
import {
  createDefaultGraphLayoutSettings,
  DEFAULT_GRAPH_SECTION_COLOR,
  type GraphLayoutCoordinate2D,
  type GraphLayoutCoordinate3D,
  type GraphLayoutMode,
  type GraphLayoutOwnership,
  type GraphLayoutOwnershipUpdate,
  type GraphLayoutPinnedNode,
  type GraphLayoutSection,
  type GraphLayoutSectionCreate,
  type GraphLayoutSectionUpdate,
  type GraphLayoutSettings,
  isGraphLayoutItemOwnedBySection,
  isGraphLayoutSectionDescendant,
} from '../../../shared/settings/graphLayout';

export { createDefaultGraphLayoutSettings };
export type {
  GraphLayoutCoordinate2D,
  GraphLayoutCoordinate3D,
  GraphLayoutMode,
  GraphLayoutOwnership,
  GraphLayoutOwnershipUpdate,
  GraphLayoutPinnedNode,
  GraphLayoutSection,
  GraphLayoutSectionCreate,
  GraphLayoutSectionUpdate,
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

export interface GraphLayoutSectionCreateUpdate extends GraphLayoutSectionCreate {
  updatedAt: string;
}

export interface GraphLayoutSectionPatch {
  sectionId: string;
  updates: GraphLayoutSectionUpdate;
  updatedAt: string;
}

function getNextGraphLayoutSectionNumber(
  sections: Readonly<Record<string, GraphLayoutSection>>,
): number {
  let nextNumber = 1;
  for (const sectionId of Object.keys(sections)) {
    const match = /^section-(\d+)$/.exec(sectionId);
    if (!match) {
      continue;
    }

    nextNumber = Math.max(nextNumber, Number(match[1]) + 1);
  }

  return nextNumber;
}

function readOptionalSectionString(value: string | undefined): string | undefined {
  return value && value.length > 0 ? value : undefined;
}

function getUniqueMemberNodeIds(memberNodeIds: readonly string[] | undefined): string[] {
  return [...new Set((memberNodeIds ?? []).filter(nodeId => nodeId.length > 0))];
}

function getUniqueMemberSectionIds(memberSectionIds: readonly string[] | undefined): string[] {
  return [...new Set((memberSectionIds ?? []).filter(sectionId => sectionId.length > 0))];
}

function assertGraphLayoutOwnerExists(
  sections: Readonly<Record<string, GraphLayoutSection>>,
  ownerSectionId: string | null | undefined,
): string | null {
  if (ownerSectionId === undefined || ownerSectionId === null) {
    return null;
  }

  if (!(ownerSectionId in sections)) {
    throw new Error('Graph Section owner does not exist.');
  }

  return ownerSectionId;
}

export function createGraphLayoutSection(
  layout: GraphLayoutSettings,
  create: GraphLayoutSectionCreateUpdate,
): GraphLayoutSettings {
  const sectionNumber = getNextGraphLayoutSectionNumber(layout.sections);
  const sectionId = `section-${sectionNumber}`;
  const ownerSectionId = assertGraphLayoutOwnerExists(layout.sections, create.ownerSectionId);
  const section: GraphLayoutSection = {
    id: sectionId,
    label: readOptionalSectionString(create.label) ?? `Section ${sectionNumber}`,
    color: readOptionalSectionString(create.color) ?? DEFAULT_GRAPH_SECTION_COLOR,
    x: create.x,
    y: create.y,
    width: create.width,
    height: create.height,
    collapsed: false,
    updatedAt: create.updatedAt,
  };
  const ownership: Record<string, GraphLayoutOwnership> = {
    ...layout.ownership,
    [sectionId]: {
      itemId: sectionId,
      itemKind: 'section',
      ownerSectionId,
      updatedAt: create.updatedAt,
    },
  };

  let nextLayout = normalizeGraphLayoutSettings({
    ...layout,
    sections: {
      ...layout.sections,
      [sectionId]: section,
    },
    ownership,
  });

  for (const nodeId of getUniqueMemberNodeIds(create.memberNodeIds)) {
    nextLayout = assignGraphLayoutOwner(nextLayout, {
      itemId: nodeId,
      itemKind: 'node',
      ownerSectionId: sectionId,
      updatedAt: create.updatedAt,
    });
  }

  for (const memberSectionId of getUniqueMemberSectionIds(create.memberSectionIds)) {
    if (!(memberSectionId in nextLayout.sections)) {
      throw new Error('Graph Section member does not exist.');
    }

    nextLayout = assignGraphLayoutOwner(nextLayout, {
      itemId: memberSectionId,
      itemKind: 'section',
      ownerSectionId: sectionId,
      updatedAt: create.updatedAt,
    });
  }

  return nextLayout;
}

function readOptionalNumberUpdate(
  nextValue: number | undefined,
  currentValue: number,
): number {
  return nextValue === undefined ? currentValue : nextValue;
}

export function updateGraphLayoutSection(
  layout: GraphLayoutSettings,
  patch: GraphLayoutSectionPatch,
): GraphLayoutSettings {
  const existing = layout.sections[patch.sectionId];
  if (!existing) {
    throw new Error('Graph Section does not exist.');
  }

  const nextSection: GraphLayoutSection = {
    ...existing,
    collapsed: patch.updates.collapsed ?? existing.collapsed,
    color: readOptionalSectionString(patch.updates.color) ?? existing.color,
    height: readOptionalNumberUpdate(patch.updates.height, existing.height),
    label: readOptionalSectionString(patch.updates.label) ?? existing.label,
    width: readOptionalNumberUpdate(patch.updates.width, existing.width),
    x: readOptionalNumberUpdate(patch.updates.x, existing.x),
    y: readOptionalNumberUpdate(patch.updates.y, existing.y),
    updatedAt: patch.updatedAt,
  };
  const delta = {
    x: nextSection.x - existing.x,
    y: nextSection.y - existing.y,
  };

  const nextSections: Record<string, GraphLayoutSection> = {
    ...layout.sections,
    [patch.sectionId]: nextSection,
  };

  if (delta.x !== 0 || delta.y !== 0) {
    for (const [sectionId, section] of Object.entries(layout.sections)) {
      if (
        sectionId !== patch.sectionId
        && isGraphLayoutSectionDescendant(layout.ownership, sectionId, patch.sectionId)
      ) {
        nextSections[sectionId] = {
          ...section,
          x: section.x + delta.x,
          y: section.y + delta.y,
          updatedAt: patch.updatedAt,
        };
      }
    }
  }

  const nextPinnedNodes: Record<string, GraphLayoutPinnedNode> = { ...layout.pinnedNodes };
  if (delta.x !== 0 || delta.y !== 0) {
    for (const [itemId, pinnedNode] of Object.entries(layout.pinnedNodes)) {
      if (
        !pinnedNode.twoDimensional
        || (itemId !== patch.sectionId
          && !isGraphLayoutItemOwnedBySection(layout.ownership, itemId, patch.sectionId))
      ) {
        continue;
      }

      nextPinnedNodes[itemId] = {
        ...pinnedNode,
        twoDimensional: {
          x: pinnedNode.twoDimensional.x + delta.x,
          y: pinnedNode.twoDimensional.y + delta.y,
        },
        updatedAt: patch.updatedAt,
      };
    }
  }

  return normalizeGraphLayoutSettings({
    ...layout,
    pinnedNodes: nextPinnedNodes,
    sections: nextSections,
  });
}

export interface GraphLayoutSectionDelete {
  sectionId: string;
  updatedAt: string;
}

export function deleteGraphLayoutSection(
  layout: GraphLayoutSettings,
  deletion: GraphLayoutSectionDelete,
): GraphLayoutSettings {
  if (!(deletion.sectionId in layout.sections)) {
    throw new Error('Graph Section does not exist.');
  }

  const deletedOwnerId = layout.ownership[deletion.sectionId]?.ownerSectionId ?? null;
  const nextSections = { ...layout.sections };
  delete nextSections[deletion.sectionId];

  const nextPinnedNodes = { ...layout.pinnedNodes };
  delete nextPinnedNodes[deletion.sectionId];

  const nextOwnership: Record<string, GraphLayoutOwnership> = {};
  for (const [itemId, record] of Object.entries(layout.ownership)) {
    if (itemId === deletion.sectionId) {
      continue;
    }

    nextOwnership[itemId] = record.ownerSectionId === deletion.sectionId
      ? {
          ...record,
          ownerSectionId: deletedOwnerId,
          updatedAt: deletion.updatedAt,
        }
      : record;
  }

  return normalizeGraphLayoutSettings({
    ...layout,
    ownership: nextOwnership,
    pinnedNodes: nextPinnedNodes,
    sections: nextSections,
  });
}

export interface GraphLayoutOwnershipPatch extends GraphLayoutOwnershipUpdate {
  updatedAt: string;
}
