import type {
  IPluginDataHost,
  IPluginDataSaveOptions,
  IPluginFactoryOptions,
  IPluginUpdateImpactPolicy,
} from '@codegraphy-dev/plugin-api';
import { z } from 'zod';
import { createWorkspacePluginDataHost } from './data/host';
import type { CodeGraphyInstalledPluginRecord } from './installedCache';
import type { PackagePluginFactoryInvocation } from './packageModule';
import type { CodeGraphyWorkspacePluginSettings } from '../workspace/settings';
import { readPluginUpdateImpact } from './updateImpact';
import { unknownRecordSchema } from '../values';

const corePluginDescriptorDataSchema = z.looseObject({
  defaultOptions: unknownRecordSchema.optional().catch(undefined),
  updateImpact: z.unknown().optional(),
});

export function readCodeGraphyPluginDescriptorDefaultOptions(
  record: CodeGraphyInstalledPluginRecord,
): Record<string, unknown> | undefined {
  const parsed = corePluginDescriptorDataSchema.safeParse(record.data);
  return parsed.success && parsed.data.defaultOptions
    ? { ...parsed.data.defaultOptions }
    : undefined;
}

export interface CodeGraphyCorePluginDescriptorData {
  defaultOptions?: Record<string, unknown>;
  updateImpact?: IPluginUpdateImpactPolicy;
}

export function readCodeGraphyCorePluginDescriptorData(
  record: CodeGraphyInstalledPluginRecord,
): CodeGraphyCorePluginDescriptorData | undefined {
  if (record.host !== 'core') return undefined;

  const parsed = corePluginDescriptorDataSchema.safeParse(record.data);
  if (!parsed.success) return undefined;

  const defaultOptions = readCodeGraphyPluginDescriptorDefaultOptions(record);
  const updateImpact = readPluginUpdateImpact(parsed.data.updateImpact);
  return {
    ...(defaultOptions
      ? { defaultOptions }
      : {}),
    ...(updateImpact ? { updateImpact } : {}),
  };
}

export function mergePluginOptions(
  record: CodeGraphyInstalledPluginRecord,
  settings: CodeGraphyWorkspacePluginSettings,
): Record<string, unknown> | undefined {
  const merged = {
    ...readCodeGraphyPluginDescriptorDefaultOptions(record),
    ...settings.options,
  };

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
