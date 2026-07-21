export const FILE_ROWS_QUERY = 'SELECT * FROM File ORDER BY path';

export const NODE_ROWS_QUERY = `SELECT Node.*, File.path AS filePath, Parent.key AS parentKey,
  NodeView.color, NodeView.x, NodeView.y, NodeView.favorite, NodeView.shape,
  NodeView.imageUrl, NodeView.isCollapsed
  FROM Node
  LEFT JOIN File ON File.id = Node.fileId
  LEFT JOIN Node AS Parent ON Parent.id = Node.parentId
  LEFT JOIN NodeView ON NodeView.nodeKey = Node.key
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
