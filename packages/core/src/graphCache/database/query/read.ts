export const FILE_ANALYSIS_ROWS_QUERY =
  'SELECT filePath, mtime, size, analysis FROM FileAnalysis ORDER BY filePath';

export const SYMBOL_ROWS_QUERY =
  'SELECT symbolId, filePath, name, kind, signature, rangeJson, metadataJson FROM Symbol ORDER BY filePath, symbolId';

export const RELATION_ROWS_QUERY =
  'SELECT relationId, filePath, kind, pluginId, sourceId, fromFilePath, toFilePath, fromNodeId, toNodeId, fromSymbolId, toSymbolId, specifier, relationType, variant, resolvedPath, metadataJson FROM Relation ORDER BY filePath, relationId';
