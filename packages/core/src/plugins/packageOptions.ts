import type { IPluginDataHost, IPluginDataSaveOptions, IPluginFactoryOptions } from '@codegraphy-dev/plugin-api';
import { createWorkspacePluginDataHost } from './data/host';
import type { CodeGraphyInstalledPluginRecord } from './installedCache';
import type { PackagePluginFactoryInvocation } from './packageModule';
import type { CodeGraphyWorkspacePluginSettings } from '../workspace/settings';

export function mergePluginOptions(
  _record: CodeGraphyInstalledPluginRecord,
  settings: CodeGraphyWorkspacePluginSettings,
): Record<string, unknown> | undefined {
  const merged = { ...settings.options };

  return Object.keys(merged).length > 0 ? merged : undefined;
}

function createDeferredWorkspacePluginDataHost(
  workspaceRoot: string,
): {
  dataHost: IPluginDataHost;
  bindPluginId(pluginId: string): void;
} {
  let boundDataHost: IPluginDataHost | undefined;
  const getBoundDataHost = (): IPluginDataHost => {
    if (!boundDataHost) {
      throw new Error('CodeGraphy plugin data host is not bound to a plugin yet.');
    }

    return boundDataHost;
  };

  return {
    dataHost: {
      loadData<T>(fallback: T): T {
        return getBoundDataHost().loadData(fallback);
      },
      async saveData<T>(data: T, options?: IPluginDataSaveOptions): Promise<void> {
        await getBoundDataHost().saveData(data, options);
      },
    },
    bindPluginId(pluginId: string): void {
      boundDataHost = createWorkspacePluginDataHost(workspaceRoot, pluginId);
    },
  };
}

export function createPackagePluginFactoryInvocation(
  record: CodeGraphyInstalledPluginRecord,
  settings: CodeGraphyWorkspacePluginSettings,
  workspaceRoot: string | undefined,
): {
  invocation: PackagePluginFactoryInvocation;
  options?: Record<string, unknown>;
} {
  const options = mergePluginOptions(record, settings);
  const dataHost = workspaceRoot
    ? createDeferredWorkspacePluginDataHost(workspaceRoot)
    : undefined;
  const factoryOptions: IPluginFactoryOptions = {
    ...(options ? { options } : {}),
    ...(dataHost ? { dataHost: dataHost.dataHost } : {}),
  };

  return {
    invocation: {
      ...(Object.keys(factoryOptions).length > 0 ? { options: factoryOptions } : {}),
      ...(dataHost ? { bindPluginId: (pluginId: string) => dataHost.bindPluginId(pluginId) } : {}),
    },
    ...(options ? { options } : {}),
  };
}
