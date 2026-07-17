export const INDEXED_FILE_ROWS_QUERY =
  'SELECT path, mtime, size, contentHash, analyzerStateJson FROM IndexedFile ORDER BY path';

export const NODE_ROWS_QUERY =
  'SELECT id, type, label, filePath, parentId, propertiesJson FROM Node ORDER BY id';

export const EDGE_ROWS_QUERY =
  'SELECT id, sourceId, targetId, type, propertiesJson, provenanceJson FROM Edge ORDER BY id';
