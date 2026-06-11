import type { IGroup } from './groups';
import type { BidirectionalEdgeMode, DirectionMode, NodeSizeMode } from './modes';
import type { IPhysicsSettings } from './physics';
import type { BackgroundEffectsSettings } from './backgroundEffects';

export interface ISettingsSnapshot {
  physics: IPhysicsSettings;
  legends: IGroup[];
  filterPatterns: string[];
  disabledCustomFilterPatterns: string[];
  disabledPluginFilterPatterns: string[];
  showOrphans: boolean;
  bidirectionalMode: BidirectionalEdgeMode;
  directionMode: DirectionMode;
  directionColor: string;
  nodeColors: Record<string, string>;
  nodeVisibility: Record<string, boolean>;
  edgeVisibility: Record<string, boolean>;
  legendVisibility: Record<string, boolean>;
  legendOrder: string[];
  particleSpeed: number;
  particleSize: number;
  backgroundEffects: BackgroundEffectsSettings;
  showLabels: boolean;
  nodeSizeMode: NodeSizeMode;
  maxFiles: number;
  verboseDiagnostics: boolean;
}
