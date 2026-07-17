export interface IndexedFileRow {
  path?: unknown;
  mtime?: unknown;
  size?: unknown;
  contentHash?: unknown;
  analyzerStateJson?: unknown;
}

export interface GraphNodeRow {
  id?: unknown;
  type?: unknown;
  label?: unknown;
  filePath?: unknown;
  parentId?: unknown;
  propertiesJson?: unknown;
}

export interface GraphEdgeRow {
  id?: unknown;
  sourceId?: unknown;
  targetId?: unknown;
  type?: unknown;
  propertiesJson?: unknown;
  provenanceJson?: unknown;
}
