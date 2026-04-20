import {
  getCodeGraphyConfiguration,
  updateCodeGraphyConfigurationSilently,
} from '../../../../repoSettings/current';

export const SILENT_CONFIG_KEYS = new Set([
  'bidirectionalEdges',
  'directionColor',
  'directionMode',
  'disabledPlugins',
  'disabledCustomFilterPatterns',
  'disabledPluginFilterPatterns',
  'edgeVisibility',
  'filterPatterns',
  'maxFiles',
  'nodeColors',
  'nodeVisibility',
  'particleSize',
  'particleSpeed',
  'pluginOrder',
  'showLabels',
]);

export function createSettingsConfigPersistence(dependencies: {
  dagModeKey: string;
  nodeSizeModeKey: string;
}): {
  config: ReturnType<typeof getCodeGraphyConfiguration>;
  persistConfig(key: string, value: unknown): Promise<void>;
} {
  const config = getCodeGraphyConfiguration();

  return {
    config,
    persistConfig: async (key: string, value: unknown): Promise<void> => {
      if (
        SILENT_CONFIG_KEYS.has(key)
        || key === dependencies.dagModeKey
        || key === dependencies.nodeSizeModeKey
      ) {
        await updateCodeGraphyConfigurationSilently(key, value);
        return;
      }

      await config.update(key, value);
    },
  };
}
