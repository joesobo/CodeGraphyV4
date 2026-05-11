import { isPlainObject } from '../store/model/plainObject';
import {
  createDefaultGraphLayoutSettings,
  DEFAULT_GRAPH_SECTION_COLOR,
  setGraphLayoutNodeCollapsed,
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
} from '../../../shared/settings/graphLayout';

export { createDefaultGraphLayoutSettings };
export { setGraphLayoutNodeCollapsed };
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

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
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

interface MatchingRecordIdentity {
  id: string;
  updatedAt: string;
}

function readMatchingRecordIdentity(
  value: Record<string, unknown>,
  key: string,
  idField: 'id' | 'itemId' | 'nodeId',
): MatchingRecordIdentity | undefined {
  const id = readRequiredString(value[idField]);
  const updatedAt = readRequiredString(value.updatedAt);
  if (id !== key || !updatedAt) {
    return undefined;
  }

  return { id, updatedAt };
}

function readKeyedRecordIdentity(
  value: Record<string, unknown>,
  key: string,
  idField: 'id' | 'nodeId',
): MatchingRecordIdentity | undefined {
  const explicitId = readString(value[idField]);
  const id = explicitId ?? key;
  const updatedAt = readRequiredString(value.updatedAt);
  if (id !== key || !updatedAt) {
    return undefined;
  }

  return { id, updatedAt };
}

function readKeyedRecordId(
  value: Record<string, unknown>,
  key: string,
  idField: 'id' | 'nodeId',
): string | undefined {
  const explicitId = readString(value[idField]);
  const id = explicitId ?? key;
  return id === key ? id : undefined;
}

function readPinnedNodeCoordinates(
  value: Record<string, unknown>,
): Pick<GraphLayoutPinnedNode, '2D' | '3D'> | undefined {
  const twoDimensional = readCoordinate2D(value['2D'])
    ?? readCoordinate2D(value.twoDimensional);
  const threeDimensional = readCoordinate3D(value['3D'])
    ?? readCoordinate3D(value.threeDimensional);
  if (!twoDimensional && !threeDimensional) {
    return undefined;
  }

  return {
    ...(twoDimensional ? { '2D': twoDimensional } : {}),
    ...(threeDimensional ? { '3D': threeDimensional } : {}),
  };
}

function normalizePinnedNode(
  key: string,
  value: unknown,
): GraphLayoutPinnedNode | undefined {
  if (!isPlainObject(value)) {
    return undefined;
  }

  const nodeId = readKeyedRecordId(value, key, 'nodeId');
  const coordinates = readPinnedNodeCoordinates(value);
  if (!nodeId || !coordinates) {
    return undefined;
  }

  return {
    nodeId,
    ...coordinates,
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

function normalizeCollapsedNodes(value: unknown): Record<string, boolean> {
  if (!isPlainObject(value)) {
    return {};
  }

  const collapsedNodes: Record<string, boolean> = {};
  for (const [key, entryValue] of Object.entries(value)) {
    if (typeof entryValue === 'boolean') {
      collapsedNodes[key] = entryValue;
    }
  }

  return collapsedNodes;
}

interface SectionTextFields {
  color: string;
  icon?: string;
  id: string;
  label: string;
  updatedAt: string;
}

interface SectionBounds {
  height: number;
  width: number;
  x: number;
  y: number;
}

function readSectionTextFields(
  value: Record<string, unknown>,
  key: string,
): SectionTextFields | undefined {
  const identity = readKeyedRecordIdentity(value, key, 'id');
  const label = readString(value.label);
  const color = readRequiredString(value.color);
  const icon = readOptionalSectionString(value.icon);
  if (!identity || label === undefined || !color) {
    return undefined;
  }

  return {
    color,
    ...(icon ? { icon } : {}),
    id: identity.id,
    label,
    updatedAt: identity.updatedAt,
  };
}

function readSectionBounds(value: Record<string, unknown>): SectionBounds | undefined {
  const x = readFiniteNumber(value.x);
  const y = readFiniteNumber(value.y);
  const width = readPositiveNumber(value.width);
  const height = readPositiveNumber(value.height);
  if (x === undefined || y === undefined || width === undefined || height === undefined) {
    return undefined;
  }

  return { height, width, x, y };
}

function readSectionCollapsed(value: Record<string, unknown>): boolean | undefined {
  return typeof value.collapsed === 'boolean' ? value.collapsed : undefined;
}

function readOptionalSectionString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function normalizeSection(
  key: string,
  value: unknown,
): GraphLayoutSection | undefined {
  if (!isPlainObject(value)) {
    return undefined;
  }

  const text = readSectionTextFields(value, key);
  const bounds = readSectionBounds(value);
  const collapsed = readSectionCollapsed(value);
  if (!text || !bounds || collapsed === undefined) {
    return undefined;
  }

  return {
    ...text,
    ...bounds,
    collapsed,
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

function readOwnershipItemKind(value: unknown): GraphLayoutOwnership['itemKind'] | undefined {
  return value === 'node' || value === 'section' ? value : undefined;
}

function ownsKnownSection(
  itemId: string,
  itemKind: GraphLayoutOwnership['itemKind'],
  sections: Record<string, GraphLayoutSection>,
): boolean {
  return itemKind === 'node' || itemId in sections;
}

function inferOwnershipItemKind(
  itemId: string,
  sections: Record<string, GraphLayoutSection>,
): GraphLayoutOwnership['itemKind'] {
  return itemId in sections ? 'section' : 'node';
}

function normalizeCompactOwnershipRecord(
  key: string,
  ownerSectionIdValue: unknown,
  sections: Record<string, GraphLayoutSection>,
): GraphLayoutOwnership | undefined {
  const itemKind = inferOwnershipItemKind(key, sections);
  const ownerSectionId = normalizeOwnerSectionId(
    key,
    itemKind,
    ownerSectionIdValue,
    sections,
  );
  if (ownerSectionId === undefined || ownerSectionId === null) {
    return undefined;
  }

  return {
    itemId: key,
    itemKind,
    ownerSectionId,
    updatedAt: sections[ownerSectionId].updatedAt,
  };
}

function normalizeGroupedOwnershipRecords(
  ownerSectionId: string,
  value: unknown,
  sections: Record<string, GraphLayoutSection>,
): GraphLayoutOwnership[] {
  if (!(ownerSectionId in sections) || !Array.isArray(value)) {
    return [];
  }

  const records: GraphLayoutOwnership[] = [];
  const seenItemIds = new Set<string>();
  for (const itemId of value) {
    if (typeof itemId !== 'string' || itemId.length === 0 || seenItemIds.has(itemId)) {
      continue;
    }

    seenItemIds.add(itemId);
    const itemKind = inferOwnershipItemKind(itemId, sections);
    const normalizedOwnerSectionId = normalizeOwnerSectionId(
      itemId,
      itemKind,
      ownerSectionId,
      sections,
    );
    if (normalizedOwnerSectionId === undefined || normalizedOwnerSectionId === null) {
      continue;
    }

    records.push({
      itemId,
      itemKind,
      ownerSectionId: normalizedOwnerSectionId,
      updatedAt: sections[normalizedOwnerSectionId].updatedAt,
    });
  }

  return records;
}

function normalizeOwnershipRecord(
  key: string,
  value: unknown,
  sections: Record<string, GraphLayoutSection>,
): GraphLayoutOwnership | undefined {
  if (typeof value === 'string') {
    return normalizeCompactOwnershipRecord(key, value, sections);
  }

  if (!isPlainObject(value)) {
    return undefined;
  }

  const identity = readMatchingRecordIdentity(value, key, 'itemId');
  const itemKind = readOwnershipItemKind(value.itemKind);
  if (!identity || !itemKind || !ownsKnownSection(identity.id, itemKind, sections)) {
    return undefined;
  }

  const ownerSectionId = normalizeOwnerSectionId(
    identity.id,
    itemKind,
    value.ownerSectionId,
    sections,
  );
  if (ownerSectionId === undefined || ownerSectionId === null) {
    return undefined;
  }

  return {
    itemId: identity.id,
    itemKind,
    ownerSectionId,
    updatedAt: identity.updatedAt,
  };
}

function normalizeOwnershipRecords(
  key: string,
  value: unknown,
  sections: Record<string, GraphLayoutSection>,
): GraphLayoutOwnership[] {
  if (Array.isArray(value)) {
    return normalizeGroupedOwnershipRecords(key, value, sections);
  }

  const record = normalizeOwnershipRecord(key, value, sections);
  return record ? [record] : [];
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
    const records = normalizeOwnershipRecords(key, entryValue, sections);
    for (const record of records) {
      if (record.itemId in ownership) {
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

      ownership[record.itemId] = record;
    }
  }

  return ownership;
}

export function normalizeGraphLayoutSettings(value: unknown): GraphLayoutSettings {
  if (!isPlainObject(value)) {
    return createDefaultGraphLayoutSettings();
  }

  const sections = normalizeSections(value.sections);

  return {
    collapsedNodes: normalizeCollapsedNodes(value.collapsedNodes),
    pinnedNodes: normalizePinnedNodes(value.pinnedNodes),
    sections,
    ownership: normalizeOwnership(value.ownership, sections),
  };
}

export function assignGraphLayoutOwner(
  layout: GraphLayoutSettings,
  ownership: GraphLayoutOwnership,
): GraphLayoutSettings {
  if (ownership.ownerSectionId === null) {
    if (!ownsKnownSection(ownership.itemId, ownership.itemKind, layout.sections)) {
      throw new Error('Graph Section ownership record is invalid.');
    }

    const nextOwnership = { ...layout.ownership };
    delete nextOwnership[ownership.itemId];
    return {
      ...layout,
      ownership: nextOwnership,
    };
  }

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
    '2D': update.graphMode === '2d'
      ? { x: update.position.x, y: update.position.y }
      : existing?.['2D'],
    '3D': update.graphMode === '3d' && isCoordinate3D(update.position)
      ? { x: update.position.x, y: update.position.y, z: update.position.z }
      : existing?.['3D'],
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
    ...(graphMode === '2d' ? { '2D': undefined } : {}),
    ...(graphMode === '3d' ? { '3D': undefined } : {}),
  };

  if (!nextPinnedNode['2D'] && !nextPinnedNode['3D']) {
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
  const icon = readOptionalSectionString(create.icon);
  const section: GraphLayoutSection = {
    id: sectionId,
    label: readOptionalSectionString(create.label) ?? `Section ${sectionNumber}`,
    ...(icon ? { icon } : {}),
    color: readOptionalSectionString(create.color) ?? DEFAULT_GRAPH_SECTION_COLOR,
    x: create.x,
    y: create.y,
    width: create.width,
    height: create.height,
    collapsed: false,
    updatedAt: create.updatedAt,
  };
  const sectionOwnership: Record<string, GraphLayoutOwnership> = ownerSectionId === null
    ? {}
    : {
        [sectionId]: {
          itemId: sectionId,
          itemKind: 'section',
          ownerSectionId,
          updatedAt: create.updatedAt,
        },
      };
  const ownership: Record<string, GraphLayoutOwnership> = {
    ...layout.ownership,
    ...sectionOwnership,
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

function buildUpdatedGraphLayoutSection(
  existing: GraphLayoutSection,
  patch: GraphLayoutSectionPatch,
): GraphLayoutSection {
  const icon = patch.updates.icon === undefined
    ? existing.icon
    : readOptionalSectionString(patch.updates.icon);

  return {
    ...existing,
    collapsed: patch.updates.collapsed ?? existing.collapsed,
    color: readOptionalSectionString(patch.updates.color) ?? existing.color,
    height: readOptionalNumberUpdate(patch.updates.height, existing.height),
    ...(icon ? { icon } : { icon: undefined }),
    label: patch.updates.label === undefined ? existing.label : patch.updates.label,
    width: readOptionalNumberUpdate(patch.updates.width, existing.width),
    x: readOptionalNumberUpdate(patch.updates.x, existing.x),
    y: readOptionalNumberUpdate(patch.updates.y, existing.y),
    updatedAt: patch.updatedAt,
  };
}

function getSectionMoveDelta(
  existing: Pick<GraphLayoutSection, 'x' | 'y'>,
  nextSection: Pick<GraphLayoutSection, 'x' | 'y'>,
): GraphLayoutCoordinate2D {
  return {
    x: nextSection.x - existing.x,
    y: nextSection.y - existing.y,
  };
}

function hasSectionMoveDelta(delta: GraphLayoutCoordinate2D): boolean {
  return delta.x !== 0 || delta.y !== 0;
}

function shouldMovePinnedNodeWithSection(
  itemId: string,
  pinnedNode: GraphLayoutPinnedNode,
  sectionId: string,
): boolean {
  return !!pinnedNode['2D'] && itemId === sectionId;
}

function movePinnedGraphLayoutNodes(
  layout: GraphLayoutSettings,
  sectionId: string,
  delta: GraphLayoutCoordinate2D,
): Record<string, GraphLayoutPinnedNode> {
  const nextPinnedNodes: Record<string, GraphLayoutPinnedNode> = { ...layout.pinnedNodes };
  if (!hasSectionMoveDelta(delta)) {
    return nextPinnedNodes;
  }

  for (const [itemId, pinnedNode] of Object.entries(layout.pinnedNodes)) {
    if (!shouldMovePinnedNodeWithSection(itemId, pinnedNode, sectionId)) {
      continue;
    }

    nextPinnedNodes[itemId] = {
      ...pinnedNode,
      '2D': {
        x: pinnedNode['2D']!.x + delta.x,
        y: pinnedNode['2D']!.y + delta.y,
      },
    };
  }

  return nextPinnedNodes;
}

export function updateGraphLayoutSection(
  layout: GraphLayoutSettings,
  patch: GraphLayoutSectionPatch,
): GraphLayoutSettings {
  const existing = layout.sections[patch.sectionId];
  if (!existing) {
    throw new Error('Graph Section does not exist.');
  }

  const nextSection = buildUpdatedGraphLayoutSection(existing, patch);
  const delta = getSectionMoveDelta(existing, nextSection);
  const nextSections: Record<string, GraphLayoutSection> = { ...layout.sections };
  nextSections[patch.sectionId] = nextSection;

  return normalizeGraphLayoutSettings({
    ...layout,
    pinnedNodes: movePinnedGraphLayoutNodes(layout, patch.sectionId, delta),
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

    if (record.ownerSectionId !== deletion.sectionId) {
      nextOwnership[itemId] = record;
      continue;
    }

    if (deletedOwnerId) {
      nextOwnership[itemId] = {
        ...record,
        ownerSectionId: deletedOwnerId,
        updatedAt: deletion.updatedAt,
      };
    }
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
