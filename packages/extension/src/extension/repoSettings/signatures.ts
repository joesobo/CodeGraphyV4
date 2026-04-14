import { createHash } from 'node:crypto';
import type { ICodeGraphyRepoSettings } from './defaults';

interface PluginSignatureEntry {
  plugin: {
    id: string;
    version: string;
  };
}

function sortRecord<T extends string | boolean>(record: Record<string, T>): Array<[string, T]> {
  return Object.keys(record)
    .sort((left, right) => left.localeCompare(right))
    .map((key): [string, T] => [key, record[key]]);
}

export function createCodeGraphyPluginSignature(
  plugins: ReadonlyArray<PluginSignatureEntry>,
): string | null {
  if (plugins.length === 0) {
    return null;
  }

  return plugins
    .map(({ plugin }) => `${plugin.id}@${plugin.version}`)
    .join('|');
}

function createStableScalarSettings(settings: Partial<ICodeGraphyRepoSettings>) {
  return {
    maxFiles: settings.maxFiles ?? null,
    respectGitignore: settings.respectGitignore ?? true,
    depthMode: settings.depthMode ?? false,
    depthLimit: settings.depthLimit ?? 1,
  };
}

function createStableListSettings(settings: Partial<ICodeGraphyRepoSettings>) {
  return {
    include: settings.include ?? [],
    filterPatterns: settings.filterPatterns ?? [],
    pluginOrder: settings.pluginOrder ?? [],
  };
}

function createStableVisibilitySettings(settings: Partial<ICodeGraphyRepoSettings>) {
  return {
    nodeVisibility: sortRecord(settings.nodeVisibility ?? {}),
    edgeVisibility: sortRecord(settings.edgeVisibility ?? {}),
  };
}

export function createCodeGraphySettingsSignature(
  settings: Partial<ICodeGraphyRepoSettings>,
): string {
  const stableSettings = {
    ...createStableScalarSettings(settings),
    ...createStableListSettings(settings),
    ...createStableVisibilitySettings(settings),
  };

  return createHash('sha1')
    .update(JSON.stringify(stableSettings))
    .digest('hex');
}
