import type {
  GraphMetadata,
  GraphEdgeKind,
  IAnalysisNode,
  IAnalysisRelation,
  IAnalysisSymbol,
  IGraphEdge,
  IGraphEdgeSource,
  IGraphNode,
} from '@codegraphy-dev/plugin-api';
import {
  EDGE_METADATA_COLUMNS,
  type EdgeMetadataRole,
  type GraphEdgeRow,
  type GraphNodeRow,
} from './types';
import { readOptionalNumber, readOptionalString, readRequiredString } from './values';

function readBoolean(value: unknown): boolean | undefined {
  if (value === 1 || value === 1n) return true;
  if (value === 0 || value === 0n) return false;
  return undefined;
}

function compactMetadata(entries: Array<[string, string | number | boolean | undefined]>): GraphMetadata | undefined {
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
    ['source', readOptionalString(row.analysisSource)],
    ['pluginKind', readOptionalString(row.pluginKind)],
    ['gitIgnored', readBoolean(row.gitIgnored)],
    ['gitIgnoredReason', readOptionalString(row.gitIgnoredReason)],
    ['unityClass', readOptionalString(row.unityClass)],
    ['fileId', readOptionalString(row.unityFileId)],
    ['gameObjectFileId', readOptionalString(row.unityGameObjectFileId)],
    ['scriptGuid', readOptionalString(row.unityScriptGuid)],
    ['scriptPath', readOptionalString(row.unityScriptPath)],
    ['parentId', readOptionalString(row.parentId)],
  ]);
}

function edgeMetadata(
  row: GraphEdgeRow,
  role: EdgeMetadataRole,
): GraphMetadata | undefined {
  const columns = Object.entries(EDGE_METADATA_COLUMNS[role]) as Array<[
    string,
    keyof GraphEdgeRow,
  ]>;
  return compactMetadata(columns.map(([metadataKey, column]) => [
    metadataKey,
    readOptionalString(row[column]),
  ]));
}

function optionalNumber(value: unknown): number | undefined {
  return readOptionalNumber(value);
}

export function createSnapshotGraphNode(row: GraphNodeRow): IGraphNode | undefined {
  const id = readRequiredString(row.id);
  const nodeType = readRequiredString(row.type);
  const label = readRequiredString(row.label);
  if (!id || !nodeType || !label) return undefined;

  const color = readOptionalString(row.color) ?? '#808080';
  const shapeWidth = optionalNumber(row.shapeWidth);
  const shapeHeight = optionalNumber(row.shapeHeight);
  const pointerWidth = optionalNumber(row.pointerWidth);
  const pointerHeight = optionalNumber(row.pointerHeight);
  const symbolName = readOptionalString(row.symbolName);
  const symbolKind = readOptionalString(row.symbolKind);
  const symbolFilePath = readOptionalString(row.filePath);
  const symbolId = readOptionalString(row.analysisSymbolId) ?? id;
  const startLine = optionalNumber(row.startLine);
  const endLine = optionalNumber(row.endLine);
  const metadata = nodeMetadata(row);

  return {
    id,
    label,
    nodeType,
    color,
    ...(optionalNumber(row.x) !== undefined ? { x: optionalNumber(row.x) } : {}),
    ...(optionalNumber(row.y) !== undefined ? { y: optionalNumber(row.y) } : {}),
    ...(readBoolean(row.favorite) !== undefined ? { favorite: readBoolean(row.favorite) } : {}),
    ...(optionalNumber(row.fileSize) !== undefined ? { fileSize: optionalNumber(row.fileSize) } : {}),
    ...(optionalNumber(row.depthLevel) !== undefined ? { depthLevel: optionalNumber(row.depthLevel) } : {}),
    ...(readOptionalString(row.shape) ? { shape2D: readOptionalString(row.shape) as IGraphNode['shape2D'] } : {}),
    ...(shapeWidth !== undefined && shapeHeight !== undefined
      ? { shapeSize2D: { width: shapeWidth, height: shapeHeight } }
      : {}),
    ...(optionalNumber(row.cornerRadius) !== undefined ? { cornerRadius2D: optionalNumber(row.cornerRadius) } : {}),
    ...(optionalNumber(row.collisionRadius) !== undefined ? { collisionRadius2D: optionalNumber(row.collisionRadius) } : {}),
    ...(optionalNumber(row.chargeStrengthMultiplier) !== undefined
      ? { chargeStrengthMultiplier2D: optionalNumber(row.chargeStrengthMultiplier) }
      : {}),
    ...(optionalNumber(row.fillOpacity) !== undefined ? { fillOpacity2D: optionalNumber(row.fillOpacity) } : {}),
    ...(pointerWidth !== undefined && pointerHeight !== undefined
      ? { pointerArea2D: { width: pointerWidth, height: pointerHeight } }
      : {}),
    ...(readOptionalString(row.imageUrl) ? { imageUrl: readOptionalString(row.imageUrl) } : {}),
    ...(readBoolean(row.isCollapsible) !== undefined ? { isCollapsible: readBoolean(row.isCollapsible) } : {}),
    ...(readBoolean(row.isCollapsed) !== undefined ? { isCollapsed: readBoolean(row.isCollapsed) } : {}),
    ...(optionalNumber(row.collapsedDescendantCount) !== undefined
      ? { collapsedDescendantCount: optionalNumber(row.collapsedDescendantCount) }
      : {}),
    ...(symbolName && symbolKind && symbolFilePath
      ? {
          symbol: {
            id: symbolId,
            name: symbolName,
            kind: symbolKind,
            filePath: symbolFilePath,
            ...(readOptionalString(row.pluginKind) ? { pluginKind: readOptionalString(row.pluginKind) } : {}),
            ...(readOptionalString(row.symbolSignature) ? { signature: readOptionalString(row.symbolSignature) } : {}),
            ...(readOptionalString(row.language) ? { language: readOptionalString(row.language) } : {}),
            ...(readOptionalString(row.analysisSource) ? { source: readOptionalString(row.analysisSource) } : {}),
            ...(startLine !== undefined && endLine !== undefined
              ? {
                  range: {
                    startLine,
                    endLine,
                    ...(optionalNumber(row.startColumn) !== undefined ? { startColumn: optionalNumber(row.startColumn) } : {}),
                    ...(optionalNumber(row.endColumn) !== undefined ? { endColumn: optionalNumber(row.endColumn) } : {}),
                  },
                }
              : {}),
          },
        }
      : {}),
    ...(metadata ? { metadata } : {}),
  };
}

export function createSnapshotAnalysisNode(row: GraphNodeRow): IAnalysisNode | undefined {
  const id = readRequiredString(row.analysisNodeId);
  const nodeType = readRequiredString(row.type);
  const label = readRequiredString(row.label);
  if (!id || !nodeType || !label) return undefined;
  const filePath = readOptionalString(row.analysisNodeFilePath);
  const parentId = readOptionalString(row.analysisParentId);
  const metadata = nodeMetadata(row);
  return {
    id,
    nodeType,
    label,
    ...(filePath ? { filePath } : {}),
    ...(parentId ? { parentId } : {}),
    ...(metadata ? { metadata } : {}),
  };
}

export function createSnapshotAnalysisSymbol(row: GraphNodeRow): IAnalysisSymbol | undefined {
  const id = readRequiredString(row.analysisSymbolId);
  const name = readRequiredString(row.symbolName);
  const kind = readRequiredString(row.symbolKind);
  const filePath = readRequiredString(row.analysisSymbolFilePath);
  if (!id || !name || !kind || !filePath) return undefined;
  const startLine = optionalNumber(row.startLine);
  const endLine = optionalNumber(row.endLine);
  const metadata = nodeMetadata(row);
  return {
    id,
    name,
    kind: kind as GraphEdgeKind,
    filePath,
    ...(readOptionalString(row.symbolSignature) ? { signature: readOptionalString(row.symbolSignature) } : {}),
    ...(startLine !== undefined && endLine !== undefined
      ? {
          range: {
            startLine,
            endLine,
            ...(optionalNumber(row.startColumn) !== undefined ? { startColumn: optionalNumber(row.startColumn) } : {}),
            ...(optionalNumber(row.endColumn) !== undefined ? { endColumn: optionalNumber(row.endColumn) } : {}),
          },
        }
      : {}),
    ...(metadata ? { metadata } : {}),
  };
}

function createGraphEdgeSource(row: GraphEdgeRow): IGraphEdgeSource | undefined {
  const id = readOptionalString(row.sourceKey);
  const pluginId = readOptionalString(row.sourcePluginId);
  const sourceId = readOptionalString(row.pluginSourceId);
  const label = readOptionalString(row.sourceLabel);
  if (!id || !pluginId || !sourceId || !label) return undefined;
  const metadata = edgeMetadata(row, 'source');
  return {
    id,
    pluginId,
    sourceId,
    label,
    ...(readOptionalString(row.variant) ? { variant: readOptionalString(row.variant) } : {}),
    ...(metadata ? { metadata } : {}),
  };
}

export function createSnapshotGraphEdge(row: GraphEdgeRow): IGraphEdge | undefined {
  const id = readRequiredString(row.graphId);
  const from = readRequiredString(row.sourceNodeId);
  const to = readRequiredString(row.targetNodeId);
  const kind = readRequiredString(row.type);
  if (!id || !from || !to || !kind) return undefined;
  const source = createGraphEdgeSource(row);
  const metadata = edgeMetadata(row, 'edge');
  return {
    id,
    from,
    to,
    kind: kind as GraphEdgeKind,
    ...(readOptionalString(row.color) ? { color: readOptionalString(row.color) } : {}),
    sources: source ? [source] : [],
    ...(metadata ? { metadata } : {}),
  };
}

export function createSnapshotAnalysisRelation(row: GraphEdgeRow): IAnalysisRelation | undefined {
  if (readBoolean(row.analysisRelation) !== true) return undefined;
  const kind = readRequiredString(row.type);
  const sourceId = readRequiredString(row.analysisSourceId);
  const fromFilePath = readRequiredString(row.fromFilePath);
  if (!kind || !sourceId || !fromFilePath) return undefined;
  const metadata = edgeMetadata(row, 'relation');
  const toFilePath = readOptionalString(row.toFilePath);
  const resolvedPath = readOptionalString(row.resolvedPath);
  return {
    kind: kind as GraphEdgeKind,
    sourceId,
    fromFilePath,
    ...(readOptionalString(row.relationPluginId) ? { pluginId: readOptionalString(row.relationPluginId) } : {}),
    ...(toFilePath ? { toFilePath } : {}),
    ...(readOptionalString(row.fromAnalysisNodeId) ? { fromNodeId: readOptionalString(row.fromAnalysisNodeId) } : {}),
    ...(readOptionalString(row.toAnalysisNodeId) ? { toNodeId: readOptionalString(row.toAnalysisNodeId) } : {}),
    ...(readOptionalString(row.fromSymbolId) ? { fromSymbolId: readOptionalString(row.fromSymbolId) } : {}),
    ...(readOptionalString(row.toSymbolId) ? { toSymbolId: readOptionalString(row.toSymbolId) } : {}),
    ...(readOptionalString(row.specifier) ? { specifier: readOptionalString(row.specifier) } : {}),
    ...(readOptionalString(row.relationType) ? { type: readOptionalString(row.relationType) } : {}),
    ...(readOptionalString(row.variant) ? { variant: readOptionalString(row.variant) } : {}),
    ...(resolvedPath ? { resolvedPath } : {}),
    ...(metadata ? { metadata } : {}),
  };
}
