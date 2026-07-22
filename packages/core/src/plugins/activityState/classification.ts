import type { CodeGraphyInstalledPluginRecord } from '../installedPluginCache/contracts';
import type { CodeGraphyWorkspacePluginSettings } from '../../workspace/settings';

export type PluginActivityClassification =
  | { kind: 'active-built-in' }
  | { kind: 'active-package'; record: CodeGraphyInstalledPluginRecord }
  | { kind: 'disabled' }
  | { kind: 'inactive'; warning: string };

export function classifyPluginActivity(input: {
  builtInPluginIds: ReadonlySet<string>;
  enabled: boolean;
  installedPlugins: readonly CodeGraphyInstalledPluginRecord[];
  plugin: CodeGraphyWorkspacePluginSettings;
}): PluginActivityClassification {
  if (!input.enabled) return { kind: 'disabled' };
  if (input.builtInPluginIds.has(input.plugin.id)) return { kind: 'active-built-in' };
  if (input.installedPlugins.length === 1) {
    return { kind: 'active-package', record: input.installedPlugins[0] };
  }

  const detail = input.installedPlugins.length > 1
    ? `multiple installed packages claim it: ${input.installedPlugins.map(plugin => plugin.package).join(', ')}`
    : 'not installed';
  return {
    kind: 'inactive',
    warning: `CodeGraphy plugin '${input.plugin.id}' is enabled but ${detail}. No runtime was loaded.`,
  };
}
