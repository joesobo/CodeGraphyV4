import { z } from 'zod';
import { readDisclosures } from '../disclosures';
import type { CodeGraphyInstalledPluginRecord } from './contracts';
import { readPluginUpdateImpact } from '../updateImpact';
import { looseStringArraySchema, unknownRecordSchema } from '../../values';

const nonEmptyStringSchema = z.string().min(1);

const installedPluginRecordShapeSchema = z.looseObject({
  package: nonEmptyStringSchema,
  version: nonEmptyStringSchema,
  apiVersion: nonEmptyStringSchema,
  packageRoot: nonEmptyStringSchema,
  globallyEnabled: z.boolean().optional().catch(undefined),
  disclosures: z.unknown(),
  defaultOptions: unknownRecordSchema.optional().catch(undefined),
  pluginId: nonEmptyStringSchema.optional().catch(undefined),
  pluginName: nonEmptyStringSchema.optional().catch(undefined),
  updateImpact: z.unknown(),
  supportedExtensions: looseStringArraySchema
    .transform(entries => entries.filter(entry => entry.length > 0)),
});

export function normalizeInstalledPluginRecord(value: unknown): CodeGraphyInstalledPluginRecord | null {
  const parsed = installedPluginRecordShapeSchema.safeParse(value);
  if (!parsed.success) {
    return null;
  }

  const shape = parsed.data;
  const record: CodeGraphyInstalledPluginRecord = {
    package: shape.package,
    version: shape.version,
    apiVersion: shape.apiVersion,
    disclosures: readDisclosures(shape.disclosures),
    packageRoot: shape.packageRoot,
    globallyEnabled: shape.globallyEnabled ?? false,
  };

  if (shape.defaultOptions) {
    record.defaultOptions = { ...shape.defaultOptions };
  }
  if (shape.pluginId) {
    record.pluginId = shape.pluginId;
  }
  if (shape.pluginName) {
    record.pluginName = shape.pluginName;
  }
  const updateImpact = readPluginUpdateImpact(shape.updateImpact);
  if (updateImpact) {
    record.updateImpact = updateImpact;
  }
  if (shape.supportedExtensions.length > 0) {
    record.supportedExtensions = shape.supportedExtensions;
  }

  return record;
}
