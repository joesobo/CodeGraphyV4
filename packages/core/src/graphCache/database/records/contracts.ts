export interface FileRow {
  filePath?: unknown;
  mtime?: unknown;
  size?: unknown;
  contentHash?: unknown;
  factsJson?: unknown;
}

export interface SymbolRow {
  symbolId?: unknown;
  filePath?: unknown;
  name?: unknown;
  kind?: unknown;
  signature?: unknown;
  rangeJson?: unknown;
  metadataJson?: unknown;
}

export interface NodeRow {
  nodeId?: unknown;
  filePath?: unknown;
  nodeType?: unknown;
  label?: unknown;
  sourceFilePath?: unknown;
  parentId?: unknown;
  metadataJson?: unknown;
}

export interface GraphTypeRow {
  recordId?: unknown;
  filePath?: unknown;
  typeId?: unknown;
  label?: unknown;
  defaultColor?: unknown;
  defaultVisible?: unknown;
  parentId?: unknown;
  descriptionJson?: unknown;
}

export interface RelationRow {
  relationId?: unknown;
  filePath?: unknown;
  kind?: unknown;
  pluginId?: unknown;
  sourceId?: unknown;
  fromFilePath?: unknown;
  toFilePath?: unknown;
  fromNodeId?: unknown;
  toNodeId?: unknown;
  fromSymbolId?: unknown;
  toSymbolId?: unknown;
  specifier?: unknown;
  relationType?: unknown;
  variant?: unknown;
  resolvedPath?: unknown;
  metadataJson?: unknown;
}
