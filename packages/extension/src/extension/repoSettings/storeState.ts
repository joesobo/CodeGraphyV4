import * as fs from 'node:fs';
import {
  createDefaultCodeGraphyRepoSettings,
  type ICodeGraphyRepoSettings,
} from './defaults';
import { collectChangedKeys } from './storeDiff';
import { normalizePersistedSettingsShape } from './storeNormalization';
import { deepClone, deepMerge } from './storeObjects';
import { serializeSettings } from './storeSerialization';
import { setNestedValue } from './storeValues';

interface SettingsState {
  serializedSettings: string;
  settings: ICodeGraphyRepoSettings;
}

export function createUpdatedSettings(
  defaults: ICodeGraphyRepoSettings,
  settings: ICodeGraphyRepoSettings,
  key: string,
  value: unknown,
): ICodeGraphyRepoSettings {
  const nextSettings = deepClone(settings) as unknown as Record<string, unknown>;
  setNestedValue(nextSettings, key, value);
  return deepMerge(defaults, nextSettings);
}

function createSettingsState(settings: ICodeGraphyRepoSettings): SettingsState {
  return {
    serializedSettings: serializeSettings(settings),
    settings,
  };
}

export function readSettingsFromDisk(
  settingsPath: string,
  defaults: ICodeGraphyRepoSettings,
): SettingsState {
  try {
    const rawSerialized = fs.readFileSync(settingsPath, 'utf8');
    const parsed = normalizePersistedSettingsShape(JSON.parse(rawSerialized));
    const merged = deepMerge(defaults, parsed);
    const nextState = createSettingsState(merged);
    if (rawSerialized !== nextState.serializedSettings) {
      fs.writeFileSync(settingsPath, nextState.serializedSettings, 'utf8');
    }
    return nextState;
  } catch (error) {
    console.warn('[CodeGraphy] Failed to read .codegraphy/settings.json, regenerating defaults.', error);
    const nextState = createSettingsState(createDefaultCodeGraphyRepoSettings());
    fs.writeFileSync(settingsPath, nextState.serializedSettings, 'utf8');
    return nextState;
  }
}

export function writeSettingsToDisk(
  settingsPath: string,
  settings: ICodeGraphyRepoSettings,
): string {
  const serializedSettings = serializeSettings(settings);
  fs.writeFileSync(settingsPath, serializedSettings, 'utf8');
  return serializedSettings;
}

export function reloadSettingsFromDisk(
  settingsPath: string,
  defaults: ICodeGraphyRepoSettings,
  previousSettings: ICodeGraphyRepoSettings,
  serializedSettings: string,
):
  | {
      changedKeys: string[];
      serializedSettings: string;
      settings: ICodeGraphyRepoSettings;
    }
  | undefined {
  if (!fs.existsSync(settingsPath)) {
    const settings = createDefaultCodeGraphyRepoSettings();
    const changedKeys = collectChangedKeys(previousSettings, settings);
    return {
      changedKeys: changedKeys.length > 0 ? changedKeys : ['codegraphy'],
      serializedSettings: writeSettingsToDisk(settingsPath, settings),
      settings,
    };
  }

  const nextSerialized = fs.readFileSync(settingsPath, 'utf8');
  if (nextSerialized === serializedSettings) {
    return undefined;
  }

  try {
    const settings = deepMerge(
      defaults,
      normalizePersistedSettingsShape(JSON.parse(nextSerialized)),
    );
    const nextState = createSettingsState(settings);
    const changedKeys = collectChangedKeys(previousSettings, settings);
    return {
      changedKeys: changedKeys.length > 0 ? changedKeys : ['codegraphy'],
      serializedSettings: nextState.serializedSettings,
      settings,
    };
  } catch (error) {
    console.warn('[CodeGraphy] Ignoring invalid .codegraphy/settings.json save.', error);
    return undefined;
  }
}
