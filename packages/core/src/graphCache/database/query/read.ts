export const FILE_ROWS_QUERY = 'SELECT * FROM File ORDER BY path';

export const NODE_ROWS_QUERY = `SELECT Node.*, File.path AS filePath, Parent.key AS parentKey
  FROM Node
  LEFT JOIN File ON File.id = Node.fileId
  LEFT JOIN Node AS Parent ON Parent.id = Node.parentId
  ORDER BY Node.key`;

export const SYMBOL_ROWS_QUERY = `SELECT Symbol.*, Node.key AS nodeKey, File.path AS filePath
  FROM Symbol
  JOIN Node ON Node.id = Symbol.nodeId
  LEFT JOIN File ON File.id = Node.fileId
  ORDER BY Node.key`;

export const EDGE_ROWS_QUERY = `SELECT Edge.*, Source.key AS sourceNodeKey,
  Target.key AS targetNodeKey, File.path AS ownerFilePath
  FROM Edge
  JOIN Node AS Source ON Source.id = Edge.sourceNodeId
  JOIN Node AS Target ON Target.id = Edge.targetNodeId
  LEFT JOIN File ON File.id = Edge.ownerFileId
  ORDER BY Edge.graphKey, Edge.key`;
