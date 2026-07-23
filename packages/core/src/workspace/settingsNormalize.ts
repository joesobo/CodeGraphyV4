import { z } from 'zod';
import { createDefaultCodeGraphyWorkspaceSettings } from './settingsDefaults';
import type { CodeGraphyWorkspaceSettings } from './settingsContracts';
import { normalizePluginSettings } from './settingsPlugins';
import { looseStringArraySchema, unknownRecordSchema } from '../values';

const workspaceSettingsShapeSchema = z.looseObject({
  maxFiles: z.number().finite().optional().catch(undefined),
  include: looseStringArraySchema,
  respectGitignore: z.boolean().optional().catch(undefined),
  filterPatterns: looseStringArraySchema,
  disabledCustomFilterPatterns: looseStringArraySchema,
  nodeVisibility: unknownRecordSchema.catch({}),
  edgeVisibility: unknownRecordSchema.catch({}),
  plugins: z.unknown(),
  interfaces: z.unknown(),
  pluginData: unknownRecordSchema.catch({}),
});

function normalizeInterfaceSettings(value: unknown): CodeGraphyWorkspaceSettings['interfaces'] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  return value.flatMap((entry) => {
    const parsed = unknownRecordSchema.safeParse(entry);
    if (
      !parsed.success
      || typeof parsed.data.id !== 'string'
      || !('data' in parsed.data)
    ) return [];
    const id = parsed.data.id.trim();
    if (!id || seen.has(id)) return [];
    seen.add(id);
    return [{ id, data: parsed.data.data }];
  });
}

export function normalizeCodeGraphyWorkspaceSettings(
  value: unknown,
): CodeGraphyWorkspaceSettings {
  const defaults = createDefaultCodeGraphyWorkspaceSettings();
  const parsed = workspaceSettingsShapeSchema.safeParse(value);
  if (!parsed.success) {
    return defaults;
  }

  const shape = parsed.data;
  const booleanEntries = (value: Record<string, unknown>): Record<string, boolean> => Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean'),
  );
  return {
    version: 1,
    maxFiles: shape.maxFiles ?? defaults.maxFiles,
    include: shape.include.length > 0 ? shape.include : defaults.include,
    respectGitignore: shape.respectGitignore ?? defaults.respectGitignore,
    filterPatterns: [...new Set(shape.filterPatterns)],
    disabledCustomFilterPatterns: [...new Set(shape.disabledCustomFilterPatterns)],
    nodeVisibility: booleanEntries(shape.nodeVisibility),
    edgeVisibility: booleanEntries(shape.edgeVisibility),
    plugins: normalizePluginSettings(shape.plugins),
    interfaces: normalizeInterfaceSettings(shape.interfaces),
    pluginData: { ...shape.pluginData },
  };
}
