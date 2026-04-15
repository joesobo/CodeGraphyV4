export interface FileAnalysisRow {
  filePath?: unknown;
  mtime?: unknown;
  size?: unknown;
  analysis?: unknown;
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
export { createSnapshotFileEntry } from './cacheFileEntry';
export { createSnapshotRelationEntry } from './cacheRelationEntry';
export { createSnapshotSymbolEntry } from './cacheSymbolEntry';
