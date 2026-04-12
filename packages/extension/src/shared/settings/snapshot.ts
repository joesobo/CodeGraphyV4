import type { IGroup } from './groups';
import type { BidirectionalEdgeMode, DirectionMode, NodeSizeMode } from './modes';
import type { IPhysicsSettings } from './physics';

export interface ISettingsSnapshot {
  physics: IPhysicsSettings;
  legends: IGroup[];
  filterPatterns: string[];
  showOrphans: boolean;
  bidirectionalMode: BidirectionalEdgeMode;
  directionMode: DirectionMode;
  directionColor: string;
  nodeColors: Record<string, string>;
  nodeVisibility: Record<string, boolean>;
  edgeVisibility: Record<string, boolean>;
  edgeColors: Record<string, string>;
  pluginOrder: string[];
  disabledPlugins: string[];
  particleSpeed: number;
  particleSize: number;
  showLabels: boolean;
  nodeSizeMode: NodeSizeMode;
  maxFiles: number;
}
