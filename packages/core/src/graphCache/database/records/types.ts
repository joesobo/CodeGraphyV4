import type { SQLiteValue } from '../io/connection';

export const FILE_COLUMNS = ['path', 'mtime', 'size', 'contentHash'] as const;

export const NODE_COLUMNS = [
  'key', 'type', 'label', 'fileId', 'parentId', 'pluginId', 'language',
] as const;

export const NODE_VIEW_COLUMNS = [
  'nodeKey', 'color', 'x', 'y', 'favorite', 'shape', 'imageUrl', 'isCollapsed',
] as const;

export const SYMBOL_COLUMNS = ['nodeId', 'name', 'kind', 'pluginId', 'language'] as const;

export const EDGE_COLUMNS = ['key', 'sourceNodeId', 'targetNodeId', 'type'] as const;

type ColumnRecord<Columns extends readonly string[]> = Record<Columns[number], SQLiteValue>;

export type FileRecord = ColumnRecord<typeof FILE_COLUMNS> & {
  path: string;
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

export type NodeViewRecord = ColumnRecord<typeof NODE_VIEW_COLUMNS> & {
  nodeKey: string;
  favorite: number | null;
  isCollapsed: number | null;
};

export type SymbolRecord = ColumnRecord<typeof SYMBOL_COLUMNS> & {
  nodeId: string;
  name: string;
  kind: string;
};

export type StoredSymbolRecord = Omit<SymbolRecord, 'nodeId'> & {
  nodeId: number;
};

export type EdgeRecord = ColumnRecord<typeof EDGE_COLUMNS> & {
  key: string;
  sourceNodeId: string;
  targetNodeId: string;
  type: string;
};

export type StoredEdgeRecord = Omit<EdgeRecord, 'sourceNodeId' | 'targetNodeId'> & {
  sourceNodeId: number;
  targetNodeId: number;
};

export interface FileRow {
  id?: unknown;
  path?: unknown;
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
  shape?: unknown;
  imageUrl?: unknown;
  isCollapsed?: unknown;
  pluginId?: unknown;
  language?: unknown;
}

export interface SymbolRow {
  nodeId?: unknown;
  nodeKey?: unknown;
  ownerFilePath?: unknown;
  name?: unknown;
  kind?: unknown;
  pluginId?: unknown;
  language?: unknown;
}

export interface GraphEdgeRow {
  id?: unknown;
  key?: unknown;
  sourceNodeId?: unknown;
  sourceNodeKey?: unknown;
  sourceNodeType?: unknown;
  sourceFilePath?: unknown;
  targetNodeId?: unknown;
  targetNodeKey?: unknown;
  targetNodeType?: unknown;
  targetFilePath?: unknown;
  type?: unknown;
}
