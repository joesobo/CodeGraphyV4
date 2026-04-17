export const FILE_ANALYSIS_ROWS_QUERY =
  'MATCH (entry:FileAnalysis) RETURN entry.filePath AS filePath, entry.mtime AS mtime, entry.size AS size, entry.analysis AS analysis ORDER BY entry.filePath';

export const SYMBOL_ROWS_QUERY =
  'MATCH (entry:Symbol) RETURN entry.symbolId AS symbolId, entry.filePath AS filePath, entry.name AS name, entry.kind AS kind, entry.signature AS signature, entry.rangeJson AS rangeJson, entry.metadataJson AS metadataJson ORDER BY entry.filePath, entry.symbolId';

export const RELATION_ROWS_QUERY =
  'MATCH (entry:Relation) RETURN entry.relationId AS relationId, entry.filePath AS filePath, entry.kind AS kind, entry.pluginId AS pluginId, entry.sourceId AS sourceId, entry.fromFilePath AS fromFilePath, entry.toFilePath AS toFilePath, entry.fromNodeId AS fromNodeId, entry.toNodeId AS toNodeId, entry.fromSymbolId AS fromSymbolId, entry.toSymbolId AS toSymbolId, entry.specifier AS specifier, entry.relationType AS relationType, entry.variant AS variant, entry.resolvedPath AS resolvedPath, entry.metadataJson AS metadataJson ORDER BY entry.filePath, entry.relationId';
