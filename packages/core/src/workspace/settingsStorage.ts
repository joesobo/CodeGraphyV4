import * as fs from 'node:fs';
import * as path from 'node:path';
import { getWorkspaceSettingsPath } from './paths';
import {
  createDefaultCodeGraphyWorkspaceSettings,
  createInitialCodeGraphyWorkspaceSettings,
} from './settingsDefaults';
import { normalizeCodeGraphyWorkspaceSettings } from './settingsNormalize';
import { unknownRecordSchema } from '../values';
import type { CodeGraphyWorkspaceSettings } from './settingsContracts';
import { hasSupportedRawPluginIdentity } from './settingsPlugins';
import {
  CODEGRAPHY_MARKDOWN_PLUGIN_ID,
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
} from './settingsDefaults';

function writeRawWorkspaceSettings(workspaceRoot: string, settings: Record<string, unknown>): void {
  const settingsPath = getWorkspaceSettingsPath(workspaceRoot);
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
}

function readPluginIdentity(value: unknown): string | undefined {
  const parsed = unknownRecordSchema.safeParse(value);
  if (!parsed.success) return undefined;
  const id = typeof parsed.data.id === 'string' ? parsed.data.id.trim() : '';
  if (id) return id;
  if (typeof parsed.data.package !== 'string') return undefined;
  const packageName = parsed.data.package.trim();
  if (packageName === CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME) return CODEGRAPHY_MARKDOWN_PLUGIN_ID;
  return packageName || undefined;
}

function findLastRawPluginIndex(
  rawPlugins: readonly unknown[],
  pluginId: string,
  usedIndexes: ReadonlySet<number>,
): number {
  for (let index = rawPlugins.length - 1; index >= 0; index -= 1) {
    if (!usedIndexes.has(index) && readPluginIdentity(rawPlugins[index]) === pluginId) {
      return index;
    }
  }
  return -1;
}

function mergeRawPluginEntries(rawValue: unknown, plugins: CodeGraphyWorkspaceSettings['plugins']): unknown[] {
  const rawPlugins: unknown[] = Array.isArray(rawValue) ? rawValue as unknown[] : [];
  const usedIndexes = new Set<number>();
  const merged = plugins.map((plugin) => {
    const rawIndex = findLastRawPluginIndex(rawPlugins, plugin.id, usedIndexes);
    if (rawIndex < 0) return plugin;
    usedIndexes.add(rawIndex);
    const raw = unknownRecordSchema.safeParse(rawPlugins[rawIndex]);
    if (!raw.success) return plugin;
    const rawFields = { ...raw.data };
    delete rawFields.enabled;
    const rawOptions = unknownRecordSchema.safeParse(raw.data.options);
    const pluginFields: Record<string, unknown> = { ...plugin };
    if (!('id' in raw.data) && 'package' in raw.data) delete pluginFields.id;
    return {
      ...rawFields,
      ...pluginFields,
      ...(plugin.options || rawOptions.success
        ? { options: { ...(rawOptions.success ? rawOptions.data : {}), ...(plugin.options ?? {}) } }
        : {}),
    };
  });
  return [
    ...merged,
    ...rawPlugins.filter((entry, index) => (
      !usedIndexes.has(index) && !hasSupportedRawPluginIdentity(entry)
    )),
  ];
}

export function readCodeGraphyWorkspaceSettings(
  workspaceRoot: string,
): CodeGraphyWorkspaceSettings {
  try {
    return normalizeCodeGraphyWorkspaceSettings(
      JSON.parse(fs.readFileSync(getWorkspaceSettingsPath(workspaceRoot), 'utf-8')),
    );
  } catch {
    return createDefaultCodeGraphyWorkspaceSettings();
  }
}

export function readCodeGraphyWorkspaceSettingsOrInitial(
  workspaceRoot: string,
): CodeGraphyWorkspaceSettings {
  if (!fs.existsSync(getWorkspaceSettingsPath(workspaceRoot))) {
    return createInitialCodeGraphyWorkspaceSettings();
  }

  return readCodeGraphyWorkspaceSettings(workspaceRoot);
}

export function writeCodeGraphyWorkspaceSettings(
  workspaceRoot: string,
  settings: CodeGraphyWorkspaceSettings,
): void {
  const rawSettings = readRawWorkspaceSettingsOrInitial(workspaceRoot);
  const normalized = normalizeCodeGraphyWorkspaceSettings(settings);
  writeRawWorkspaceSettings(workspaceRoot, {
    ...rawSettings,
    ...normalized,
    plugins: mergeRawPluginEntries(rawSettings.plugins, normalized.plugins),
    ...('version' in rawSettings ? { version: rawSettings.version } : {}),
  });
}

function readRawWorkspaceSettingsOrInitial(workspaceRoot: string): Record<string, unknown> {
  try {
    const parsed = unknownRecordSchema.safeParse(
      JSON.parse(fs.readFileSync(getWorkspaceSettingsPath(workspaceRoot), 'utf-8')),
    );
    return parsed.success ? { ...parsed.data } : { ...createInitialCodeGraphyWorkspaceSettings() };
  } catch {
    return { ...createInitialCodeGraphyWorkspaceSettings() };
  }
}

export function patchCodeGraphyWorkspaceSettings(
  workspaceRoot: string,
  patch: Record<string, unknown>,
): void {
  writeRawWorkspaceSettings(workspaceRoot, {
    ...readRawWorkspaceSettingsOrInitial(workspaceRoot),
    ...patch,
  });
}

export function patchCodeGraphyWorkspaceSettingRecord(
  workspaceRoot: string,
  key: string,
  updates: Record<string, unknown>,
): void {
  const raw = readRawWorkspaceSettingsOrInitial(workspaceRoot);
  const current = unknownRecordSchema.safeParse(raw[key]);
  patchCodeGraphyWorkspaceSettings(workspaceRoot, {
    [key]: { ...(current.success ? current.data : {}), ...updates },
  });
}

export function writeCodeGraphyWorkspacePluginData(
  workspaceRoot: string,
  pluginId: string,
  data: unknown,
): void {
  const settings = readRawWorkspaceSettingsOrInitial(workspaceRoot);
  const parsedPluginData = unknownRecordSchema.safeParse(settings.pluginData);
  const pluginData = parsedPluginData.success ? { ...parsedPluginData.data } : {};
  settings.pluginData = {
    ...pluginData,
    [pluginId]: data,
  };

  const settingsPath = getWorkspaceSettingsPath(workspaceRoot);
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(
    settingsPath,
    `${JSON.stringify(settings, null, 2)}\n`,
  );
}

export function ensureCodeGraphyWorkspaceSettings(
  workspaceRoot: string,
): CodeGraphyWorkspaceSettings {
  if (!fs.existsSync(getWorkspaceSettingsPath(workspaceRoot))) {
    const settings = createInitialCodeGraphyWorkspaceSettings();
    writeCodeGraphyWorkspaceSettings(workspaceRoot, settings);
    return settings;
  }
  return readCodeGraphyWorkspaceSettings(workspaceRoot);
}
