import type { NodeSizeMode } from '../../../shared/settings/modes';
import type { IPhysicsSettings } from '../../../shared/settings/physics';
import type { ISettingsSnapshot } from '../../../shared/settings/snapshot';
import { readGraphViewSettings } from './reader';

interface GraphViewSettingsConfig {
  get<T>(section: string, defaultValue: T): T;
}

export function captureGraphViewSettingsSnapshot(
  config: GraphViewSettingsConfig,
  physics: IPhysicsSettings,
  nodeSizeMode: NodeSizeMode,
): ISettingsSnapshot {
  const settings = readGraphViewSettings(config);

  return {
    physics,
    groups: config.get('groups', []),
    filterPatterns: config.get('filterPatterns', []),
    showOrphans: config.get('showOrphans', true),
    bidirectionalMode: config.get('bidirectionalEdges', 'separate'),
    directionMode: config.get('directionMode', 'arrows'),
    directionColor: settings.directionColor,
    folderNodeColor: settings.folderNodeColor,
    particleSpeed: config.get('particleSpeed', 0.005),
    particleSize: config.get('particleSize', 4),
    showLabels: config.get('showLabels', true),
    maxFiles: config.get('maxFiles', 500),
    hiddenPluginGroups: config.get('hiddenPluginGroups', []),
    nodeSizeMode,
  };
}
