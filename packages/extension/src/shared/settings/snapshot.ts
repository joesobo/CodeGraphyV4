import type { IGroup } from './groups';
import type { BidirectionalEdgeMode, DirectionMode, NodeSizeMode } from './modes';
import type { IPhysicsSettings } from './physics';

export interface ISettingsSnapshot {
  physics: IPhysicsSettings;
  groups: IGroup[];
  filterPatterns: string[];
  showOrphans: boolean;
  bidirectionalMode: BidirectionalEdgeMode;
  directionMode: DirectionMode;
  directionColor: string;
  folderNodeColor: string;
  particleSpeed: number;
  particleSize: number;
  showLabels: boolean;
  nodeSizeMode: NodeSizeMode;
  maxFiles: number;
  hiddenPluginGroups: string[];
}
