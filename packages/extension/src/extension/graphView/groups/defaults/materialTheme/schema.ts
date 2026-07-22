import { z } from 'zod';
import { unknownRecordSchema } from '../../../../../shared/values';
import type { MaterialIconManifest } from './model';

const materialStringRecordSchema = unknownRecordSchema.transform((record): Record<string, string> =>
  Object.fromEntries(
    Object.entries(record).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  )
);

const materialIconDefinitionSchema = z.looseObject({ iconPath: z.string() });
const materialIconDefinitionsSchema = unknownRecordSchema.transform(
  (record): MaterialIconManifest['iconDefinitions'] => Object.fromEntries(
    Object.entries(record).flatMap(([key, value]) => {
      const parsed = materialIconDefinitionSchema.safeParse(value);
      return parsed.success
        ? [[key, { iconPath: parsed.data.iconPath }] as [string, { iconPath: string }]]
        : [];
    }),
  ),
);

const MATERIAL_MANIFEST_KEYS = [
  'fileExtensions',
  'fileNames',
  'folder',
  'folderNames',
  'folderNamesExpanded',
  'iconDefinitions',
  'languageIds',
  'rootFolder',
] as const satisfies readonly (keyof MaterialIconManifest)[];

export const materialIconManifestSchema = z.looseObject({
  fileExtensions: materialStringRecordSchema.optional().catch(undefined),
  fileNames: materialStringRecordSchema.optional().catch(undefined),
  folder: z.string().optional().catch(undefined),
  folderNames: materialStringRecordSchema.optional().catch(undefined),
  folderNamesExpanded: materialStringRecordSchema.optional().catch(undefined),
  iconDefinitions: materialIconDefinitionsSchema.optional().catch(undefined),
  languageIds: materialStringRecordSchema.optional().catch(undefined),
  rootFolder: z.string().optional().catch(undefined),
}).transform(compactMaterialIconManifest);

function compactMaterialIconManifest(manifest: MaterialIconManifest): MaterialIconManifest {
  const normalized: MaterialIconManifest = {};
  for (const key of MATERIAL_MANIFEST_KEYS) {
    const value = manifest[key];
    if (value !== undefined) {
      Object.assign(normalized, { [key]: value });
    }
  }
  return normalized;
}
