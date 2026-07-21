import * as path from 'node:path';
import type {
  GraphEdgeKind,
  GraphMetadata,
  IAnalysisNode,
  IAnalysisRelation,
  IAnalysisSymbol,
  IGraphEdge,
  IGraphNode,
} from '@codegraphy-dev/plugin-api';
import type { GraphEdgeRow, GraphNodeRow, SymbolRow } from './types';
import { readOptionalNumber, readOptionalString, readRequiredString } from './values';

function readBoolean(value: unknown): boolean | undefined {
  if (value === 1 || value === 1n) return true;
  if (value === 0 || value === 0n) return false;
  return undefined;
}

function compactMetadata(entries: Array<[string, string | undefined]>): GraphMetadata | undefined {
  const metadata: GraphMetadata = {};
  for (const [key, value] of entries) {
    if (value !== undefined) metadata[key] = value;
  }
  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

function nodeMetadata(row: GraphNodeRow): GraphMetadata | undefined {
  return compactMetadata([
    ['pluginId', readOptionalString(row.pluginId)],
    ['language', readOptionalString(row.language)],
    ['parentId', readOptionalString(row.parentKey)],
  ]);
}

function analysisIdentity(
  key: string,
  filePath: string | undefined,
  workspaceRoot: string,
): string {
  if (!filePath) return key;
  const absoluteFilePath = path.resolve(workspaceRoot, filePath);
  if (key === filePath) return absoluteFilePath;
  if (key.startsWith(`${filePath}:`) || key.startsWith(`${filePath}#`)) {
    return `${absoluteFilePath}${key.slice(filePath.length)}`;
  }
  return key;
}

export function createSnapshotGraphNode(
  row: GraphNodeRow,
  symbolRow?: SymbolRow,
): IGraphNode | undefined {
  const id = readRequiredString(row.key);
  const nodeType = readRequiredString(row.type);
  const label = readRequiredString(row.label);
  if (!id || !nodeType || !label) return undefined;

  const filePath = readOptionalString(row.filePath);
  const symbolName = readOptionalString(symbolRow?.name);
  const symbolKind = readOptionalString(symbolRow?.kind);
  const symbolLanguage = readOptionalString(symbolRow?.language);
  const metadata = nodeMetadata(row);
  return {
    id,
    label,
    nodeType,
    color: readOptionalString(row.color) ?? '#808080',
    ...(readOptionalNumber(row.x) !== undefined ? { x: readOptionalNumber(row.x) } : {}),
    ...(readOptionalNumber(row.y) !== undefined ? { y: readOptionalNumber(row.y) } : {}),
    ...(readBoolean(row.favorite) !== undefined ? { favorite: readBoolean(row.favorite) } : {}),
    ...(readOptionalString(row.shape)
      ? { shape2D: readOptionalString(row.shape) as IGraphNode['shape2D'] }
      : {}),
    ...(readOptionalString(row.imageUrl) ? { imageUrl: readOptionalString(row.imageUrl) } : {}),
    ...(readBoolean(row.isCollapsed) !== undefined ? { isCollapsed: readBoolean(row.isCollapsed) } : {}),
    ...(symbolName && symbolKind && filePath
      ? {
          symbol: {
            id,
            name: symbolName,
            kind: symbolKind,
            filePath,
            ...(symbolLanguage ? { language: symbolLanguage } : {}),
          },
        }
      : {}),
    ...(metadata ? { metadata } : {}),
  };
}

export function createSnapshotAnalysisNode(
  row: GraphNodeRow,
  workspaceRoot: string,
): IAnalysisNode | undefined {
  const key = readRequiredString(row.key);
  const nodeType = readRequiredString(row.type);
  const label = readRequiredString(row.label);
  const filePath = readOptionalString(row.filePath);
  if (!key || !nodeType || !label || !filePath) return undefined;
  const parentKey = readOptionalString(row.parentKey);
  const metadata = nodeMetadata(row);
  return {
    id: analysisIdentity(key, filePath, workspaceRoot),
    nodeType,
    label,
    filePath: path.resolve(workspaceRoot, filePath),
    ...(parentKey ? { parentId: analysisIdentity(parentKey, filePath, workspaceRoot) } : {}),
    ...(metadata ? { metadata } : {}),
  };
}

export function createSnapshotAnalysisSymbol(
  row: SymbolRow,
  workspaceRoot: string,
): IAnalysisSymbol | undefined {
  const key = readRequiredString(row.nodeKey);
  const filePath = readRequiredString(row.ownerFilePath);
  const name = readRequiredString(row.name);
  const kind = readRequiredString(row.kind);
  if (!key || !filePath || !name || !kind) return undefined;
  const metadata = compactMetadata([
    ['pluginId', readOptionalString(row.pluginId)],
    ['language', readOptionalString(row.language)],
  ]);
  return {
    id: analysisIdentity(key, filePath, workspaceRoot),
    name,
    kind,
    filePath: path.resolve(workspaceRoot, filePath),
    ...(metadata ? { metadata } : {}),
  };
}

export function createSnapshotGraphEdge(row: GraphEdgeRow): IGraphEdge | undefined {
  const id = readRequiredString(row.key);
  const from = readRequiredString(row.sourceNodeKey);
  const to = readRequiredString(row.targetNodeKey);
  const kind = readRequiredString(row.type);
  if (!id || !from || !to || !kind) return undefined;
  return { id, from, to, kind: kind as GraphEdgeKind, sources: [] };
}

export function createSnapshotAnalysisRelation(
  row: GraphEdgeRow,
  workspaceRoot: string,
): IAnalysisRelation | undefined {
  const sourceKey = readRequiredString(row.sourceNodeKey);
  const targetKey = readRequiredString(row.targetNodeKey);
  const sourceFilePath = readRequiredString(row.sourceFilePath);
  const targetFilePath = readOptionalString(row.targetFilePath);
  const sourceNodeType = readOptionalString(row.sourceNodeType);
  const targetNodeType = readOptionalString(row.targetNodeType);
  const kind = readRequiredString(row.type);
  const sourceId = readRequiredString(row.key);
  if (!sourceKey || !targetKey || !sourceFilePath || !kind || !sourceId) return undefined;

  const fromIdentity = analysisIdentity(sourceKey, sourceFilePath, workspaceRoot);
  const toIdentity = analysisIdentity(targetKey, targetFilePath, workspaceRoot);
  return {
    kind: kind as GraphEdgeKind,
    sourceId,
    fromFilePath: path.resolve(workspaceRoot, sourceFilePath),
    ...(targetFilePath ? { toFilePath: path.resolve(workspaceRoot, targetFilePath) } : {}),
    ...(sourceKey !== sourceFilePath
      ? sourceNodeType === 'symbol' ? { fromSymbolId: fromIdentity } : { fromNodeId: fromIdentity }
      : {}),
    ...(targetFilePath && targetKey === targetFilePath
      ? {}
      : targetNodeType === 'symbol' ? { toSymbolId: toIdentity } : { toNodeId: toIdentity }),
  };
}
