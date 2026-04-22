import type { NodeSizeMode } from '../../../shared/settings/modes';
import type { IPhysicsSettings } from '../../../shared/settings/physics';
import type { ISettingsSnapshot } from '../../../shared/settings/snapshot';
import { readGraphViewSettings } from './reader';

interface GraphViewSettingsConfig {
  get<T>(section: string, defaultValue: T): T;
}

function readConfigRecord<T>(
  config: GraphViewSettingsConfig,
  section: string,
): Record<string, T> {
  return config.get<Record<string, T>>(section, {}) ?? {};
}

function readConfigList<T>(
  config: GraphViewSettingsConfig,
  section: string,
): T[] {
  return config.get<T[]>(section, []) ?? [];
}

export function captureGraphViewSettingsSnapshot(
  config: GraphViewSettingsConfig,
  physics: IPhysicsSettings,
  nodeSizeMode: NodeSizeMode,
): ISettingsSnapshot {
  const settings = readGraphViewSettings(config);

  return {
    physics,
    legends: readConfigList(config, 'legend'),
    filterPatterns: readConfigList(config, 'filterPatterns'),
    disabledCustomFilterPatterns: readConfigList(config, 'disabledCustomFilterPatterns'),
    disabledPluginFilterPatterns: readConfigList(config, 'disabledPluginFilterPatterns'),
    showOrphans: config.get('showOrphans', true),
    bidirectionalMode: config.get('bidirectionalEdges', 'separate'),
    directionMode: config.get('directionMode', 'arrows'),
    directionColor: settings.directionColor,
    nodeColors: readConfigRecord<string>(config, 'nodeColors'),
    nodeColorEnabled: readConfigRecord<boolean>(config, 'nodeColorEnabled'),
    nodeVisibility: readConfigRecord<boolean>(config, 'nodeVisibility'),
    edgeVisibility: readConfigRecord<boolean>(config, 'edgeVisibility'),
    legendVisibility: readConfigRecord<boolean>(config, 'legendVisibility'),
    legendOrder: readConfigList(config, 'legendOrder'),
    pluginOrder: readConfigList(config, 'pluginOrder'),
    disabledPlugins: readConfigList(config, 'disabledPlugins'),
    particleSpeed: config.get('particleSpeed', 0.005),
    particleSize: config.get('particleSize', 4),
    showLabels: config.get('showLabels', true),
    maxFiles: config.get('maxFiles', 500),
    nodeSizeMode,
  };
}
