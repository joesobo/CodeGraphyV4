import type { IGroup } from './groups';
import type { BidirectionalEdgeMode, DirectionMode, NodeSizeMode } from './modes';
import type { GraphPhysicsSettings } from '@codegraphy-dev/graph-renderer/visuals';

export interface ISettingsSnapshot {
  physics: GraphPhysicsSettings;
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
  showMinimap: boolean;
  nodeSizeMode: NodeSizeMode;
  maxFiles: number;
  showFps: boolean;
  verboseDiagnostics: boolean;
}
