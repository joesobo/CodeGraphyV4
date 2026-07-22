import type {
  CodeGraphyInstalledPluginCache,
  CodeGraphyInstalledPluginRecord,
} from './contracts';
import { z } from 'zod';
import { normalizeInstalledPluginRecord } from './record';

const installedPluginCacheShapeSchema = z.looseObject({
  plugins: z.array(z.unknown()),
});

function createEmptyInstalledPluginCache(): CodeGraphyInstalledPluginCache {
  return {
    version: 2,
    plugins: [],
  };
}

export function normalizeInstalledPluginCache(value: unknown): CodeGraphyInstalledPluginCache {
  const parsed = installedPluginCacheShapeSchema.safeParse(value);
  if (!parsed.success) {
    return createEmptyInstalledPluginCache();
  }

  return {
    version: 2,
    plugins: parsed.data.plugins
      .map(normalizeInstalledPluginRecord)
      .filter((entry): entry is CodeGraphyInstalledPluginRecord => entry !== null),
  };
}
