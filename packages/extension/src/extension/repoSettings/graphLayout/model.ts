import { isPlainObject } from '../store/model/plainObject';
import {
  createDefaultGraphLayoutSettings,
  type GraphLayoutCoordinate2D,
  type GraphLayoutCoordinate3D,
  type GraphLayoutMode,
  type GraphLayoutPinnedNode,
  type GraphLayoutSettings,
} from '../../../shared/settings/graphLayout';

export { createDefaultGraphLayoutSettings };
export type {
  GraphLayoutCoordinate2D,
  GraphLayoutCoordinate3D,
  GraphLayoutMode,
  GraphLayoutPinnedNode,
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
  if (nodeId !== key) {
    return undefined;
  }

  const twoDimensional = readCoordinate2D(value['2D']);
  const threeDimensional = readCoordinate3D(value['3D']);
  if (!twoDimensional && !threeDimensional) {
    return undefined;
  }

  return {
    nodeId,
    ...(twoDimensional ? { '2D': twoDimensional } : {}),
    ...(threeDimensional ? { '3D': threeDimensional } : {}),
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

export function normalizeGraphLayoutSettings(value: unknown): GraphLayoutSettings {
  if (!isPlainObject(value)) {
    return createDefaultGraphLayoutSettings();
  }

  return {
    pinnedNodes: normalizePinnedNodes(value.pinnedNodes),
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
