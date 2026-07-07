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
  const settingsPath = getWorkspaceSettingsPath(workspaceRoot);
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(
    settingsPath,
    `${JSON.stringify(normalizeCodeGraphyWorkspaceSettings(settings), null, 2)}\n`,
  );
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
