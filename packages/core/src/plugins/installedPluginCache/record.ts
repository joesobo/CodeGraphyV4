import { z } from 'zod';
import type { CodeGraphyInstalledPluginRecord } from './contracts';

const nonEmptyStringSchema = z.string().trim().min(1);

const installedPluginRecordSchema = z.looseObject({
  package: nonEmptyStringSchema,
  version: nonEmptyStringSchema,
  packageRoot: nonEmptyStringSchema,
  globallyEnabled: z.boolean().catch(false),
  id: nonEmptyStringSchema,
  name: nonEmptyStringSchema.optional().catch(undefined),
  host: nonEmptyStringSchema,
  entry: nonEmptyStringSchema,
  apiVersion: nonEmptyStringSchema,
});

export function normalizeInstalledPluginRecord(value: unknown): CodeGraphyInstalledPluginRecord | null {
  const parsed = installedPluginRecordSchema.safeParse(value);
  if (!parsed.success) return null;

  return {
    package: parsed.data.package,
    version: parsed.data.version,
    packageRoot: parsed.data.packageRoot,
    globallyEnabled: parsed.data.globallyEnabled,
    id: parsed.data.id,
    ...(parsed.data.name ? { name: parsed.data.name } : {}),
    host: parsed.data.host,
    entry: parsed.data.entry,
    apiVersion: parsed.data.apiVersion,
  };
}
