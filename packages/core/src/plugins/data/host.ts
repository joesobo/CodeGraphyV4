import type { IPluginDataHost } from '@codegraphy-dev/plugin-api';
import {
  readCodeGraphyWorkspaceSettingsOrInitial,
  writeCodeGraphyWorkspaceSettings,
} from '../../workspace/settings';

export function createWorkspacePluginDataHost(
  workspaceRoot: string,
  pluginId: string,
): IPluginDataHost {
  return {
    loadData<T>(fallback: T): T {
      const settings = readCodeGraphyWorkspaceSettingsOrInitial(workspaceRoot);
      const data = settings.pluginData?.[pluginId];
      return data === undefined ? fallback : data as T;
    },
    async saveData<T>(data: T): Promise<void> {
      const settings = readCodeGraphyWorkspaceSettingsOrInitial(workspaceRoot);
      writeCodeGraphyWorkspaceSettings(workspaceRoot, {
        ...settings,
        pluginData: {
          ...(settings.pluginData ?? {}),
          [pluginId]: data,
        },
      });
    },
  };
}
