import type { NodeShape2D, NodeShape3D } from './modes';

export type LegendRuleTarget = 'node' | 'edge' | 'both';

export interface IGroup {
  id: string;
  pattern: string;
  color: string;
  target?: LegendRuleTarget;
  shape2D?: NodeShape2D;
  shape3D?: NodeShape3D;
  imagePath?: string;
  imageUrl?: string;
  isPluginDefault?: boolean;
  pluginName?: string;
  disabled?: boolean;
}
