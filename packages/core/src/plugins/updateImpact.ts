import { z } from 'zod';
import type {
  IPluginUpdateImpact,
  IPluginUpdateImpactPolicy,
} from '@codegraphy-dev/plugin-api';
import { unknownRecordSchema } from '../values';

const impactSchema: z.ZodType<IPluginUpdateImpact> = z.enum([
  'view-only',
  'settings-only',
  'projection-only',
  'reanalyze-plugin-files',
  'requires-full-index',
]);

const updateImpactPolicySchema = z.looseObject({
  toggle: impactSchema,
  defaultSetting: impactSchema.optional().catch(undefined),
  settings: unknownRecordSchema.optional().catch(undefined),
});

function readSettingsImpact(
  value: Record<string, unknown> | undefined,
): Record<string, IPluginUpdateImpact> | undefined {
  if (!value) {
    return undefined;
  }

  const settings = Object.fromEntries(
    Object.entries(value)
      .map(([key, impact]) => [key, impactSchema.safeParse(impact)] as const)
      .filter((entry): entry is [string, { success: true; data: IPluginUpdateImpact }] => entry[1].success)
      .map(([key, result]) => [key, result.data] as const),
  );

  return Object.keys(settings).length > 0 ? settings : undefined;
}

export function readPluginUpdateImpact(value: unknown): IPluginUpdateImpactPolicy | undefined {
  const parsed = updateImpactPolicySchema.safeParse(value);
  if (!parsed.success) {
    return undefined;
  }

  const { toggle, defaultSetting } = parsed.data;
  const settings = readSettingsImpact(parsed.data.settings);

  return {
    toggle,
    ...(defaultSetting ? { defaultSetting } : {}),
    ...(settings ? { settings } : {}),
  };
}
