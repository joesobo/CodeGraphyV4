import type { NodeShape2D, NodeShape3D } from './modes';

export interface IGroup {
  id: string;
  pattern: string;
  color: string;
  shape2D?: NodeShape2D;
  shape3D?: NodeShape3D;
  imagePath?: string;
  imageUrl?: string;
  isPluginDefault?: boolean;
  pluginName?: string;
  disabled?: boolean;
}
