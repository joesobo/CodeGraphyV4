import * as fs from 'node:fs';
import * as path from 'node:path';
import type { CodeGraphyInstalledPluginCache, CodeGraphyUserStateOptions } from './contracts';
import { normalizeInstalledPluginCache } from './normalize';
import { getInstalledPluginsCachePath } from './paths';

export function readCodeGraphyInstalledPluginCache(
  options: CodeGraphyUserStateOptions = {},
): CodeGraphyInstalledPluginCache {
  try {
    return normalizeInstalledPluginCache(
      JSON.parse(fs.readFileSync(getInstalledPluginsCachePath(options.homeDir), 'utf-8')),
    );
  } catch {
    return normalizeInstalledPluginCache(undefined);
  }
}

export function writeCodeGraphyInstalledPluginCache(
  cache: CodeGraphyInstalledPluginCache,
  options: CodeGraphyUserStateOptions = {},
): CodeGraphyInstalledPluginCache {
  const normalized = normalizeInstalledPluginCache(cache);
  const cachePath = getInstalledPluginsCachePath(options.homeDir);
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, `${JSON.stringify(normalized, null, 2)}\n`);
  return normalized;
}
