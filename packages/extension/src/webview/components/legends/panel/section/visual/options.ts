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

export const DEFAULT_NODE_SHAPE: Pick<IGroup, 'shape2D'> = {
  shape2D: 'circle',
};

export const SHAPE_OPTIONS: ShapeOption[] = [
  { label: 'Circle', icon: mdiCircle, shape2D: 'circle' },
  { label: 'Square', icon: mdiSquare, shape2D: 'square' },
  { label: 'Diamond', icon: mdiRhombus, shape2D: 'diamond' },
  { label: 'Triangle', icon: mdiTriangle, shape2D: 'triangle' },
  { label: 'Hexagon', icon: mdiHexagon, shape2D: 'hexagon' },
  { label: 'Star', icon: mdiStar, shape2D: 'star' },
];
