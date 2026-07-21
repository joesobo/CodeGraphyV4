import type { SQLiteValue } from '../io/connection';

export const FILE_COLUMNS = [
  'path', 'analysisPath', 'mtime', 'size', 'contentHash',
] as const;

export const NODE_COLUMNS = [
  'key', 'type', 'label', 'fileId', 'parentId', 'color', 'x', 'y', 'favorite',
  'fileSize', 'depthLevel', 'shape', 'shapeWidth', 'shapeHeight', 'cornerRadius',
  'collisionRadius', 'chargeStrengthMultiplier', 'fillOpacity', 'pointerWidth',
  'pointerHeight', 'imageUrl', 'isCollapsible', 'isCollapsed',
  'collapsedDescendantCount', 'analysisNodeId', 'analysisNodeFilePath',
  'analysisParentId', 'analysisNodeOrder', 'pluginId', 'language',
  'analysisSource', 'pluginKind', 'gitIgnored', 'gitIgnoredReason', 'unityClass',
  'unityFileId', 'unityGameObjectFileId', 'unityScriptGuid', 'unityScriptPath',
] as const;

export const SYMBOL_COLUMNS = [
  'nodeId', 'filePath', 'analysisId', 'analysisPath', 'analysisOrder', 'name', 'kind',
  'signature', 'startLine', 'startColumn', 'endLine', 'endColumn', 'pluginId',
  'language', 'analysisSource', 'pluginKind',
] as const;

export const EDGE_COLUMNS = [
  'key', 'graphKey', 'sourceNodeId', 'targetNodeId', 'type', 'ownerFileId',
  'color', 'sourcePluginId', 'relationPluginId', 'sourceKey', 'pluginSourceId',
  'analysisSourceId', 'sourceLabel', 'variant', 'relationSpecifier', 'resolvedPath',
  'relationType', 'fromFilePath', 'toFilePath', 'fromAnalysisNodeId',
  'toAnalysisNodeId', 'fromSymbolId', 'toSymbolId',
  'edgeLanguage', 'edgeOrigin', 'edgeBindingKind', 'edgeImportedName',
  'edgeLocalName', 'edgeMemberName', 'edgeSignalName', 'edgeEventMethodName',
  'edgeTargetFileId', 'edgeTargetScriptPath', 'edgeTargetScriptGuid',
  'edgeScriptGuid', 'edgePrefabGuid', 'edgeFieldName', 'edgeGuid',
  'sourceLanguage', 'sourceOrigin', 'sourceBindingKind', 'sourceImportedName',
  'sourceLocalName', 'sourceMemberName', 'sourceSignalName', 'sourceEventMethodName',
  'sourceTargetFileId', 'sourceTargetScriptPath', 'sourceTargetScriptGuid',
  'sourceScriptGuid', 'sourcePrefabGuid', 'sourceFieldName', 'sourceGuid',
  'relationLanguage', 'relationOrigin', 'relationBindingKind', 'relationImportedName',
  'relationLocalName', 'relationMemberName', 'relationSignalName',
  'relationEventMethodName', 'relationTargetFileId', 'relationTargetScriptPath',
  'relationTargetScriptGuid', 'relationScriptGuid', 'relationPrefabGuid',
  'relationFieldName', 'relationGuid', 'analysisRelation',
  'analysisOrder', 'canonicalGraphEdge',
] as const;

type ColumnRecord<Columns extends readonly string[]> = Record<Columns[number], SQLiteValue>;

export type FileRecord = ColumnRecord<typeof FILE_COLUMNS> & {
  path: string;
  analysisPath: string;
  mtime: number;
  size: number;
  contentHash: string | null;
};

export type NodeRecord = ColumnRecord<typeof NODE_COLUMNS> & {
  key: string;
  type: string;
  label: string;
  fileId: string | null;
  parentId: string | null;
};

export type StoredNodeRecord = Omit<NodeRecord, 'fileId' | 'parentId'> & {
  fileId: number | null;
  parentId: number | null;
};

export type SymbolRecord = ColumnRecord<typeof SYMBOL_COLUMNS> & {
  nodeId: string;
  filePath: string;
  name: string;
  kind: string;
};

export type StoredSymbolRecord = Omit<SymbolRecord, 'nodeId'> & {
  nodeId: number;
};

export type EdgeRecord = ColumnRecord<typeof EDGE_COLUMNS> & {
  key: string;
  graphKey: string;
  sourceNodeId: string;
  targetNodeId: string;
  type: string;
  ownerFileId: string | null;
};

export type StoredEdgeRecord = Omit<
  EdgeRecord,
  'sourceNodeId' | 'targetNodeId' | 'ownerFileId'
> & {
  sourceNodeId: number;
  targetNodeId: number;
  ownerFileId: number | null;
};

export const EDGE_METADATA_COLUMNS = {
  edge: {
    language: 'edgeLanguage', source: 'edgeOrigin', bindingKind: 'edgeBindingKind',
    importedName: 'edgeImportedName', localName: 'edgeLocalName', memberName: 'edgeMemberName',
    signalName: 'edgeSignalName', eventMethodName: 'edgeEventMethodName',
    targetFileId: 'edgeTargetFileId', targetScriptPath: 'edgeTargetScriptPath',
    targetScriptGuid: 'edgeTargetScriptGuid', scriptGuid: 'edgeScriptGuid',
    prefabGuid: 'edgePrefabGuid', fieldName: 'edgeFieldName', guid: 'edgeGuid',
  },
  source: {
    language: 'sourceLanguage', source: 'sourceOrigin', bindingKind: 'sourceBindingKind',
    importedName: 'sourceImportedName', localName: 'sourceLocalName', memberName: 'sourceMemberName',
    signalName: 'sourceSignalName', eventMethodName: 'sourceEventMethodName',
    targetFileId: 'sourceTargetFileId', targetScriptPath: 'sourceTargetScriptPath',
    targetScriptGuid: 'sourceTargetScriptGuid', scriptGuid: 'sourceScriptGuid',
    prefabGuid: 'sourcePrefabGuid', fieldName: 'sourceFieldName', guid: 'sourceGuid',
  },
  relation: {
    language: 'relationLanguage', source: 'relationOrigin', bindingKind: 'relationBindingKind',
    importedName: 'relationImportedName', localName: 'relationLocalName', memberName: 'relationMemberName',
    signalName: 'relationSignalName', eventMethodName: 'relationEventMethodName',
    targetFileId: 'relationTargetFileId', targetScriptPath: 'relationTargetScriptPath',
    targetScriptGuid: 'relationTargetScriptGuid', scriptGuid: 'relationScriptGuid',
    prefabGuid: 'relationPrefabGuid', fieldName: 'relationFieldName', guid: 'relationGuid',
  },
} as const;

export type EdgeMetadataRole = keyof typeof EDGE_METADATA_COLUMNS;

export interface FileRow {
  id?: unknown;
  path?: unknown;
  analysisPath?: unknown;
  mtime?: unknown;
  size?: unknown;
  contentHash?: unknown;
}

export interface GraphNodeRow {
  id?: unknown;
  key?: unknown;
  type?: unknown;
  label?: unknown;
  fileId?: unknown;
  filePath?: unknown;
  parentId?: unknown;
  parentKey?: unknown;
  color?: unknown;
  x?: unknown;
  y?: unknown;
  favorite?: unknown;
  fileSize?: unknown;
  depthLevel?: unknown;
  shape?: unknown;
  shapeWidth?: unknown;
  shapeHeight?: unknown;
  cornerRadius?: unknown;
  collisionRadius?: unknown;
  chargeStrengthMultiplier?: unknown;
  fillOpacity?: unknown;
  pointerWidth?: unknown;
  pointerHeight?: unknown;
  imageUrl?: unknown;
  isCollapsible?: unknown;
  isCollapsed?: unknown;
  collapsedDescendantCount?: unknown;
  analysisNodeId?: unknown;
  analysisNodeFilePath?: unknown;
  analysisParentId?: unknown;
  analysisNodeOrder?: unknown;
  pluginId?: unknown;
  language?: unknown;
  analysisSource?: unknown;
  pluginKind?: unknown;
  gitIgnored?: unknown;
  gitIgnoredReason?: unknown;
  unityClass?: unknown;
  unityFileId?: unknown;
  unityGameObjectFileId?: unknown;
  unityScriptGuid?: unknown;
  unityScriptPath?: unknown;
}

export interface SymbolRow {
  nodeId?: unknown;
  nodeKey?: unknown;
  filePath?: unknown;
  ownerFilePath?: unknown;
  analysisId?: unknown;
  analysisPath?: unknown;
  analysisOrder?: unknown;
  name?: unknown;
  kind?: unknown;
  signature?: unknown;
  startLine?: unknown;
  startColumn?: unknown;
  endLine?: unknown;
  endColumn?: unknown;
  pluginId?: unknown;
  language?: unknown;
  analysisSource?: unknown;
  pluginKind?: unknown;
}

export interface GraphEdgeRow {
  id?: unknown;
  key?: unknown;
  graphKey?: unknown;
  sourceNodeId?: unknown;
  sourceNodeKey?: unknown;
  targetNodeId?: unknown;
  targetNodeKey?: unknown;
  type?: unknown;
  ownerFileId?: unknown;
  ownerFilePath?: unknown;
  color?: unknown;
  sourcePluginId?: unknown;
  relationPluginId?: unknown;
  sourceKey?: unknown;
  pluginSourceId?: unknown;
  analysisSourceId?: unknown;
  sourceLabel?: unknown;
  variant?: unknown;
  relationSpecifier?: unknown;
  resolvedPath?: unknown;
  relationType?: unknown;
  fromFilePath?: unknown;
  toFilePath?: unknown;
  fromAnalysisNodeId?: unknown;
  toAnalysisNodeId?: unknown;
  fromSymbolId?: unknown;
  toSymbolId?: unknown;
  edgeLanguage?: unknown;
  edgeOrigin?: unknown;
  edgeBindingKind?: unknown;
  edgeImportedName?: unknown;
  edgeLocalName?: unknown;
  edgeMemberName?: unknown;
  edgeSignalName?: unknown;
  edgeEventMethodName?: unknown;
  edgeTargetFileId?: unknown;
  edgeTargetScriptPath?: unknown;
  edgeTargetScriptGuid?: unknown;
  edgeScriptGuid?: unknown;
  edgePrefabGuid?: unknown;
  edgeFieldName?: unknown;
  edgeGuid?: unknown;
  sourceLanguage?: unknown;
  sourceOrigin?: unknown;
  sourceBindingKind?: unknown;
  sourceImportedName?: unknown;
  sourceLocalName?: unknown;
  sourceMemberName?: unknown;
  sourceSignalName?: unknown;
  sourceEventMethodName?: unknown;
  sourceTargetFileId?: unknown;
  sourceTargetScriptPath?: unknown;
  sourceTargetScriptGuid?: unknown;
  sourceScriptGuid?: unknown;
  sourcePrefabGuid?: unknown;
  sourceFieldName?: unknown;
  sourceGuid?: unknown;
  relationLanguage?: unknown;
  relationOrigin?: unknown;
  relationBindingKind?: unknown;
  relationImportedName?: unknown;
  relationLocalName?: unknown;
  relationMemberName?: unknown;
  relationSignalName?: unknown;
  relationEventMethodName?: unknown;
  relationTargetFileId?: unknown;
  relationTargetScriptPath?: unknown;
  relationTargetScriptGuid?: unknown;
  relationScriptGuid?: unknown;
  relationPrefabGuid?: unknown;
  relationFieldName?: unknown;
  relationGuid?: unknown;
  analysisRelation?: unknown;
  analysisOrder?: unknown;
  canonicalGraphEdge?: unknown;
}
