import type { NodeShape2D, NodeShape3D } from '../../../../../shared/settings/modes';

export const SHAPE_2D_OPTIONS: Array<{ value: NodeShape2D; label: string }> = [
  { value: 'circle', label: 'Circle' },
  { value: 'square', label: 'Square' },
  { value: 'diamond', label: 'Diamond' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'hexagon', label: 'Hexagon' },
  { value: 'star', label: 'Star' },
];

export const SHAPE_3D_OPTIONS: Array<{ value: NodeShape3D; label: string }> = [
  { value: 'sphere', label: 'Sphere' },
  { value: 'cube', label: 'Cube' },
  { value: 'octahedron', label: 'Octahedron' },
  { value: 'cone', label: 'Cone' },
  { value: 'dodecahedron', label: 'Dodecahedron' },
  { value: 'icosahedron', label: 'Icosahedron' },
];
