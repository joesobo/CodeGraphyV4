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

export function createCodeGraphySettingsSignature(
  settings: Partial<ICodeGraphyRepoSettings>,
): string {
  const stableSettings = {
    maxFiles: settings.maxFiles ?? null,
    include: settings.include ?? [],
    respectGitignore: settings.respectGitignore ?? true,
    filterPatterns: settings.filterPatterns ?? [],
    pluginOrder: settings.pluginOrder ?? [],
    depthMode: settings.depthMode ?? false,
    depthLimit: settings.depthLimit ?? 1,
    nodeVisibility: sortRecord(settings.nodeVisibility ?? {}),
    edgeVisibility: sortRecord(settings.edgeVisibility ?? {}),
  };

  return createHash('sha1')
    .update(JSON.stringify(stableSettings))
    .digest('hex');
}
