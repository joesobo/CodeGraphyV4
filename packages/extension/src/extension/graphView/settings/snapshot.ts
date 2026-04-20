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
  const nodeColors = config.get<Record<string, string>>('nodeColors', {}) ?? {};
  const nodeVisibility = config.get<Record<string, boolean>>('nodeVisibility', {}) ?? {};
  const edgeVisibility = config.get<Record<string, boolean>>('edgeVisibility', {}) ?? {};
  const pluginOrder = config.get<string[]>('pluginOrder', []) ?? [];
  const disabledPlugins = config.get<string[]>('disabledPlugins', []) ?? [];

  return {
    physics,
    legends: config.get('legend', []),
    filterPatterns: config.get('filterPatterns', []),
    disabledCustomFilterPatterns: config.get('disabledCustomFilterPatterns', []),
    disabledPluginFilterPatterns: config.get('disabledPluginFilterPatterns', []),
    showOrphans: config.get('showOrphans', true),
    bidirectionalMode: config.get('bidirectionalEdges', 'separate'),
    directionMode: config.get('directionMode', 'arrows'),
    directionColor: settings.directionColor,
    nodeColors,
    nodeVisibility,
    edgeVisibility,
    pluginOrder,
    disabledPlugins,
    particleSpeed: config.get('particleSpeed', 0.005),
    particleSize: config.get('particleSize', 4),
    showLabels: config.get('showLabels', true),
    maxFiles: config.get('maxFiles', 500),
    nodeSizeMode,
  };
}
