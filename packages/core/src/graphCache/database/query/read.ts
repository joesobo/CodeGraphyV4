export const FILE_ROWS_QUERY = 'SELECT * FROM File ORDER BY path';

export const NODE_ROWS_QUERY = `SELECT Node.*, File.path AS filePath, Parent.key AS parentKey
  FROM Node
  LEFT JOIN File ON File.id = Node.fileId
  LEFT JOIN Node AS Parent ON Parent.id = Node.parentId
  ORDER BY Node.key`;

export const FILE_NODE_ROWS_QUERY = `SELECT Node.*, File.path AS filePath, Parent.key AS parentKey
  FROM Node
  LEFT JOIN File ON File.id = Node.fileId
  LEFT JOIN Node AS Parent ON Parent.id = Node.parentId
  WHERE Node.type = 'file'
  ORDER BY Node.key`;

export const SYMBOL_ROWS_QUERY = `SELECT Symbol.*, Node.key AS nodeKey, File.path AS ownerFilePath
  FROM Symbol
  JOIN Node ON Node.id = Symbol.nodeId
  LEFT JOIN File ON File.id = Node.fileId
  ORDER BY Node.key`;

export const EDGE_ROWS_QUERY = `SELECT Edge.*, Source.key AS sourceNodeKey,
  Source.type AS sourceNodeType, SourceFile.path AS sourceFilePath,
  Target.key AS targetNodeKey, Target.type AS targetNodeType,
  TargetFile.path AS targetFilePath
  FROM Edge
  JOIN Node AS Source ON Source.id = Edge.sourceNodeId
  JOIN Node AS Target ON Target.id = Edge.targetNodeId
  LEFT JOIN File AS SourceFile ON SourceFile.id = Source.fileId
  LEFT JOIN File AS TargetFile ON TargetFile.id = Target.fileId
  ORDER BY Edge.key`;

export const FILE_GRAPH_EDGE_ROWS_QUERY = `SELECT Edge.key, Edge.type,
  Source.key AS originalSourceNodeKey, Source.type AS sourceNodeType,
  CASE WHEN Source.type = 'file' THEN Source.key ELSE SourceFile.path END AS sourceNodeKey,
  Target.key AS originalTargetNodeKey, Target.type AS targetNodeType,
  CASE WHEN Target.type = 'file' THEN Target.key ELSE TargetFile.path END AS targetNodeKey
  FROM Edge
  JOIN Node AS Source ON Source.id = Edge.sourceNodeId
  JOIN Node AS Target ON Target.id = Edge.targetNodeId
  LEFT JOIN File AS SourceFile ON SourceFile.id = Source.fileId
  LEFT JOIN File AS TargetFile ON TargetFile.id = Target.fileId
  LEFT JOIN Symbol AS SourceSymbol ON SourceSymbol.nodeId = Source.id
  LEFT JOIN Symbol AS TargetSymbol ON TargetSymbol.nodeId = Target.id
  WHERE Edge.type <> 'contains'
    AND (Source.type = 'file' OR SourceSymbol.nodeId IS NOT NULL)
    AND (Target.type = 'file' OR TargetSymbol.nodeId IS NOT NULL)
  ORDER BY Edge.key`;
