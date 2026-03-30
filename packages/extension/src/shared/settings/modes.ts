export type NodeSizeMode = 'connections' | 'file-size' | 'access-count' | 'uniform';

export type NodeShape2D = 'circle' | 'square' | 'diamond' | 'triangle' | 'hexagon' | 'star';

export type NodeShape3D =
  | 'sphere'
  | 'cube'
  | 'octahedron'
  | 'cone'
  | 'dodecahedron'
  | 'icosahedron';

export type DirectionMode = 'arrows' | 'particles' | 'none';

export type DagMode = null | 'radialout' | 'td' | 'lr';

export type BidirectionalEdgeMode = 'separate' | 'combined';
