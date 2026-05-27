import {
  mdiCircle,
  mdiHexagon,
  mdiRhombus,
  mdiSquare,
  mdiStar,
  mdiTriangle,
} from '@mdi/js';
import type { IGroup } from '../../../../../../shared/settings/groups';
import type { ShapeOption } from './types';

export const DEFAULT_NODE_SHAPE: Pick<IGroup, 'shape2D' | 'shape3D'> = {
  shape2D: 'circle',
  shape3D: 'sphere',
};

export const SHAPE_OPTIONS: ShapeOption[] = [
  { label: 'Circle', icon: mdiCircle, shape2D: 'circle', shape3D: 'sphere' },
  { label: 'Square', icon: mdiSquare, shape2D: 'square', shape3D: 'cube' },
  { label: 'Diamond', icon: mdiRhombus, shape2D: 'diamond', shape3D: 'octahedron' },
  { label: 'Triangle', icon: mdiTriangle, shape2D: 'triangle', shape3D: 'cone' },
  { label: 'Hexagon', icon: mdiHexagon, shape2D: 'hexagon', shape3D: 'dodecahedron' },
  { label: 'Star', icon: mdiStar, shape2D: 'star', shape3D: 'icosahedron' },
];
