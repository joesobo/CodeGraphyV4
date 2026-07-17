import { z } from 'zod';
import { createDefaultCodeGraphyWorkspaceSettings } from './settingsDefaults';
import type { CodeGraphyWorkspaceSettings } from './settingsContracts';
import { normalizePluginSettings } from './settingsPlugins';
import { looseStringArraySchema, unknownRecordSchema } from '../values';

const workspaceSettingsShapeSchema = z.looseObject({
  maxFiles: z.number().finite().optional().catch(undefined),
  include: looseStringArraySchema,
  respectGitignore: z.boolean().optional().catch(undefined),
  showOrphans: z.boolean().optional().catch(undefined),
  filterPatterns: looseStringArraySchema,
  disabledCustomFilterPatterns: looseStringArraySchema,
  nodeVisibility: unknownRecordSchema.catch({}),
  edgeVisibility: unknownRecordSchema.catch({}),
  plugins: z.unknown(),
  pluginData: unknownRecordSchema.catch({}),
});

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
    showOrphans: shape.showOrphans ?? defaults.showOrphans,
    filterPatterns: [...new Set(shape.filterPatterns)],
    disabledCustomFilterPatterns: [...new Set(shape.disabledCustomFilterPatterns)],
    nodeVisibility: booleanEntries(shape.nodeVisibility),
    edgeVisibility: booleanEntries(shape.edgeVisibility),
    plugins: normalizePluginSettings(shape.plugins),
    pluginData: { ...shape.pluginData },
  };
}
