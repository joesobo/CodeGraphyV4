import type {
  IPluginUpdateImpact,
  IPluginUpdateImpactPolicy,
} from '@codegraphy-dev/plugin-api';
import { isRecord } from './packageManifestValues';

const UPDATE_IMPACT_VALUES = new Set<IPluginUpdateImpact>([
  'view-only',
  'settings-only',
  'projection-only',
  'reanalyze-plugin-files',
  'requires-full-index',
]);

function readImpact(value: unknown): IPluginUpdateImpact | undefined {
  return typeof value === 'string' && UPDATE_IMPACT_VALUES.has(value as IPluginUpdateImpact)
    ? value as IPluginUpdateImpact
    : undefined;
}

function readSettingsImpact(value: unknown): Record<string, IPluginUpdateImpact> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const settings = Object.fromEntries(
    Object.entries(value)
      .map(([key, impact]) => [key, readImpact(impact)] as const)
      .filter((entry): entry is [string, IPluginUpdateImpact] => entry[1] !== undefined),
  );

  return Object.keys(settings).length > 0 ? settings : undefined;
}

export function readPluginUpdateImpact(value: unknown): IPluginUpdateImpactPolicy | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const toggle = readImpact(value.toggle);
  if (!toggle) {
    return undefined;
  }

  const defaultSetting = readImpact(value.defaultSetting);
  const settings = readSettingsImpact(value.settings);

  return {
    toggle,
    ...(defaultSetting ? { defaultSetting } : {}),
    ...(settings ? { settings } : {}),
  };
}
