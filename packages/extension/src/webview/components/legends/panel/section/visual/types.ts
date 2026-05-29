import type { NodeShape2D, NodeShape3D } from '../../../../../../shared/settings/modes';

export interface ShapeOption {
  label: string;
  icon: string;
  shape2D: NodeShape2D;
  shape3D: NodeShape3D;
}
