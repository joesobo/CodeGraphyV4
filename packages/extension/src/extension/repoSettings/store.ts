import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  createCodeGraphyRepoSettingsFromLegacyConfig,
  createDefaultCodeGraphyRepoSettings,
  type ICodeGraphyRepoSettings,
  type LegacyCodeGraphyConfigurationLike,
} from './defaults';

export interface ICodeGraphySettingsInspect<T> {
  defaultValue?: T;
  workspaceValue?: T;
  globalValue?: T;
  workspaceFolderValue?: T;
}

export interface ICodeGraphySettingsChangeEvent {
  changedKeys: string[];
  affectsConfiguration(section: string): boolean;
}

export interface ICodeGraphyConfigurationLike {
  get<T>(key: string, defaultValue: T): T;
  inspect<T>(key: string): ICodeGraphySettingsInspect<T> | undefined;
  update(key: string, value: unknown, target?: unknown): Promise<void>;
  updateSilently?(key: string, value: unknown): Promise<void>;
}

const SETTINGS_DIR_NAME = '.codegraphy';
const SETTINGS_FILE_NAME = 'settings.json';
const SETTINGS_IGNORE_ENTRY = '.codegraphy/';

function normalizeGroupKeyAlias(key: string): string {
  if (key === 'folderNodeColor') {
    return 'nodeColors.folder';
  }

  if (key === 'groups') {
    return 'legend';
  }

  if (key.startsWith('groups.')) {
    return `legend.${key.slice('groups.'.length)}`;
  }

  return key;
}

function normalizePersistedSettingsShape(
  value: unknown,
): Record<string, unknown> {
  if (!isPlainObject(value)) {
    return {};
  }

  const normalized: Record<string, unknown> = { ...value };
  const legend = normalized.legend;
  const groups = normalized.groups;
  if (
    Array.isArray(groups)
    && (!Array.isArray(legend) || legend.length === 0)
  ) {
    normalized.legend = groups;
  }

  const nodeColors = isPlainObject(normalized.nodeColors)
    ? { ...normalized.nodeColors }
    : {};
  if (typeof normalized.folderNodeColor === 'string' && !('folder' in nodeColors)) {
    nodeColors.folder = normalized.folderNodeColor;
  }
  if (Object.keys(nodeColors).length > 0) {
    normalized.nodeColors = nodeColors;
  }

  return normalized;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepMerge<T>(base: T, overrides: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(overrides)) {
    return (overrides as T) ?? base;
  }

  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    const existing = result[key];
    if (isPlainObject(existing) && isPlainObject(value)) {
      result[key] = deepMerge(existing, value);
      continue;
    }

    result[key] = value;
  }

  return result as T;
}

function getPathSegments(key: string): string[] {
  return normalizeGroupKeyAlias(key).split('.').filter(Boolean);
}

function getNestedValue<T>(value: unknown, key: string): T | undefined {
  let current: unknown = value;
  for (const segment of getPathSegments(key)) {
    if (!isPlainObject(current) || !(segment in current)) {
      return undefined;
    }

    current = current[segment];
  }

  return current as T;
}

function hasNestedValue(value: unknown, key: string): boolean {
  let current: unknown = value;
  for (const segment of getPathSegments(key)) {
    if (!isPlainObject(current) || !(segment in current)) {
      return false;
    }

    current = current[segment];
  }

  return true;
}

function setNestedValue(value: Record<string, unknown>, key: string, nextValue: unknown): void {
  const segments = getPathSegments(key);
  const lastSegment = segments.pop();
  if (!lastSegment) {
    return;
  }

  let current: Record<string, unknown> = value;
  for (const segment of segments) {
    const existing = current[segment];
    if (!isPlainObject(existing)) {
      current[segment] = {};
    }

    current = current[segment] as Record<string, unknown>;
  }

  current[lastSegment] = nextValue;
}

function serializeSettings(value: ICodeGraphyRepoSettings): string {
  const persisted = deepClone(value) as unknown as Record<string, unknown>;

  const nodeColors = isPlainObject(persisted.nodeColors)
    ? { ...persisted.nodeColors }
    : {};
  if (typeof persisted.folderNodeColor === 'string') {
    nodeColors.folder = persisted.folderNodeColor;
  }
  persisted.nodeColors = nodeColors;
  delete persisted.folderNodeColor;

  return `${JSON.stringify(persisted, null, 2)}\n`;
}

function areValuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function collectChangedKeys(
  previous: unknown,
  next: unknown,
  basePath = '',
): string[] {
  if (areValuesEqual(previous, next)) {
    return [];
  }

  if (!isPlainObject(previous) || !isPlainObject(next)) {
    return basePath ? [basePath] : ['codegraphy'];
  }

  const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
  const changedKeys: string[] = [];

  for (const key of keys) {
    const nextPath = basePath ? `${basePath}.${key}` : key;
    changedKeys.push(
      ...collectChangedKeys(
        previous[key],
        next[key],
        nextPath,
      ),
    );
  }

  return changedKeys;
}

function createChangeEvent(changedKeys: string[]): ICodeGraphySettingsChangeEvent {
  const uniqueChangedKeys = Array.from(new Set(changedKeys));
  return {
    changedKeys: uniqueChangedKeys,
    affectsConfiguration: section => {
      if (section === 'codegraphy') {
        return true;
      }

      if (!section.startsWith('codegraphy.')) {
        return false;
      }

      const key = normalizeGroupKeyAlias(section.slice('codegraphy.'.length));
      return uniqueChangedKeys.some(
        changedKey =>
          changedKey === key ||
          changedKey.startsWith(`${key}.`) ||
          key.startsWith(`${changedKey}.`),
      );
    },
  };
}

function ensureGitIgnoreContainsCodeGraphyEntry(gitIgnorePath: string): void {
  if (!fs.existsSync(gitIgnorePath)) {
    fs.writeFileSync(gitIgnorePath, `${SETTINGS_IGNORE_ENTRY}\n`, 'utf8');
    return;
  }

  const existing = fs.readFileSync(gitIgnorePath, 'utf8');
  const lines = existing
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.some(line => line === '.codegraphy' || line === SETTINGS_IGNORE_ENTRY)) {
    return;
  }

  const suffix = existing.endsWith('\n') || existing.length === 0 ? '' : '\n';
  fs.writeFileSync(gitIgnorePath, `${existing}${suffix}${SETTINGS_IGNORE_ENTRY}\n`, 'utf8');
}

export class CodeGraphyRepoSettingsStore implements ICodeGraphyConfigurationLike {
  private readonly _settingsDirectoryPath: string;
  private readonly _settingsPath: string;
  private readonly _gitIgnorePath: string;
  private readonly _defaults = createDefaultCodeGraphyRepoSettings();
  private readonly _listeners = new Set<(event: ICodeGraphySettingsChangeEvent) => void>();
  private _settings: ICodeGraphyRepoSettings;
  private _serializedSettings = '';

  constructor(
    private readonly _workspaceRoot: string,
    legacyConfig?: LegacyCodeGraphyConfigurationLike,
  ) {
    this._settingsDirectoryPath = path.join(_workspaceRoot, SETTINGS_DIR_NAME);
    this._settingsPath = path.join(this._settingsDirectoryPath, SETTINGS_FILE_NAME);
    this._gitIgnorePath = path.join(_workspaceRoot, '.gitignore');

    fs.mkdirSync(this._settingsDirectoryPath, { recursive: true });
    ensureGitIgnoreContainsCodeGraphyEntry(this._gitIgnorePath);

    if (fs.existsSync(this._settingsPath)) {
      this._settings = this._readSettingsFromDisk();
    } else {
      this._settings = createCodeGraphyRepoSettingsFromLegacyConfig(legacyConfig);
      this._writeSettingsToDisk();
    }
  }

  get workspaceRoot(): string {
    return this._workspaceRoot;
  }

  get settingsPath(): string {
    return this._settingsPath;
  }

  get<T>(key: string, defaultValue: T): T {
    const value = getNestedValue<T>(this._settings, key);
    return value ?? defaultValue;
  }

  inspect<T>(key: string): ICodeGraphySettingsInspect<T> {
    return {
      defaultValue: getNestedValue<T>(this._defaults, key),
      workspaceValue: hasNestedValue(this._settings, key)
        ? getNestedValue<T>(this._settings, key)
        : undefined,
    };
  }

  async update(key: string, value: unknown): Promise<void> {
    const nextSettings = deepClone(this._settings) as unknown as Record<string, unknown>;
    setNestedValue(nextSettings, key, value);
    this._settings = deepMerge(this._defaults, nextSettings);
    this._writeSettingsToDisk();
    this._emit([key]);
  }

  async updateSilently(key: string, value: unknown): Promise<void> {
    const nextSettings = deepClone(this._settings) as unknown as Record<string, unknown>;
    setNestedValue(nextSettings, key, value);
    this._settings = deepMerge(this._defaults, nextSettings);
    this._writeSettingsToDisk();
  }

  onDidChange(
    listener: (event: ICodeGraphySettingsChangeEvent) => void,
  ): { dispose(): void } {
    this._listeners.add(listener);
    return {
      dispose: () => {
        this._listeners.delete(listener);
      },
    };
  }

  reload(): void {
    const previousSettings = deepClone(this._settings);

    if (!fs.existsSync(this._settingsPath)) {
      this._settings = createDefaultCodeGraphyRepoSettings();
      this._writeSettingsToDisk();
      this._emit(
        collectChangedKeys(previousSettings, this._settings).length > 0
          ? collectChangedKeys(previousSettings, this._settings)
          : ['codegraphy'],
      );
      return;
    }

    const nextSerialized = fs.readFileSync(this._settingsPath, 'utf8');
    if (nextSerialized === this._serializedSettings) {
      return;
    }

    this._settings = deepMerge(
      this._defaults,
      normalizePersistedSettingsShape(JSON.parse(nextSerialized)),
    );
    this._serializedSettings = serializeSettings(this._settings);
    const changedKeys = collectChangedKeys(previousSettings, this._settings);
    this._emit(changedKeys.length > 0 ? changedKeys : ['codegraphy']);
  }

  private _emit(changedKeys: string[]): void {
    const event = createChangeEvent(changedKeys);
    for (const listener of this._listeners) {
      listener(event);
    }
  }

  private _readSettingsFromDisk(): ICodeGraphyRepoSettings {
    try {
      const parsed = normalizePersistedSettingsShape(
        JSON.parse(fs.readFileSync(this._settingsPath, 'utf8')),
      );
      const merged = deepMerge(this._defaults, parsed);
      this._serializedSettings = serializeSettings(merged);
      return merged;
    } catch (error) {
      console.warn('[CodeGraphy] Failed to read .codegraphy/settings.json, regenerating defaults.', error);
      const fallback = createDefaultCodeGraphyRepoSettings();
      this._serializedSettings = serializeSettings(fallback);
      fs.writeFileSync(this._settingsPath, this._serializedSettings, 'utf8');
      return fallback;
    }
  }

  private _writeSettingsToDisk(): void {
    this._serializedSettings = serializeSettings(this._settings);
    fs.writeFileSync(this._settingsPath, this._serializedSettings, 'utf8');
  }
}
