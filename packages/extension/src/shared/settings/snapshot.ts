import type { IGroup } from './groups';
import type { AutoRevealMode, BidirectionalEdgeMode, DirectionMode, NodeSizeMode } from './modes';
import type { IPhysicsSettings } from './physics';

export interface ISettingsSnapshot {
  autoReveal: AutoRevealMode;
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
  pluginData: Record<string, unknown>;
  showLabels: boolean;
  nodeSizeMode: NodeSizeMode;
  maxFiles: number;
  verboseDiagnostics: boolean;
}
