import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  createDefaultCodeGraphyRepoSettings,
  type ICodeGraphyRepoSettings,
} from '../defaults';
import { createChangeEvent } from './change/event';
import {
  ensureGitIgnoreContainsCodeGraphyEntry,
  SETTINGS_DIR_NAME,
  SETTINGS_FILE_NAME,
} from './persistence/files';
import {
  createUpdatedSettings,
  readSettingsFromDisk,
  reloadSettingsFromDisk,
  writeSettingsToDisk,
} from './persistence/diskState';
import { getNestedValue, hasNestedValue } from './model/nestedValues';

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

export class CodeGraphyRepoSettingsStore implements ICodeGraphyConfigurationLike {
  private readonly _settingsDirectoryPath: string;
  private readonly _settingsPath: string;
  private readonly _gitIgnorePath: string;
  private readonly _defaults = createDefaultCodeGraphyRepoSettings();
  private readonly _listeners = new Set<(event: ICodeGraphySettingsChangeEvent) => void>();
  private _settings: ICodeGraphyRepoSettings;
  private _serializedSettings: string;

  constructor(
    private readonly _workspaceRoot: string,
  ) {
    this._settingsDirectoryPath = path.join(_workspaceRoot, SETTINGS_DIR_NAME);
    this._settingsPath = path.join(this._settingsDirectoryPath, SETTINGS_FILE_NAME);
    this._gitIgnorePath = path.join(_workspaceRoot, '.gitignore');

    fs.mkdirSync(this._settingsDirectoryPath, { recursive: true });
    ensureGitIgnoreContainsCodeGraphyEntry(this._gitIgnorePath);

    if (fs.existsSync(this._settingsPath)) {
      const nextState = readSettingsFromDisk(this._settingsPath, this._defaults);
      this._settings = nextState.settings;
      this._serializedSettings = nextState.serializedSettings;
    } else {
      this._settings = createDefaultCodeGraphyRepoSettings();
      this._serializedSettings = writeSettingsToDisk(this._settingsPath, this._settings);
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
    this._settings = createUpdatedSettings(this._defaults, this._settings, key, value);
    this._serializedSettings = writeSettingsToDisk(this._settingsPath, this._settings);
    this._emit([key]);
  }

  async updateSilently(key: string, value: unknown): Promise<void> {
    this._settings = createUpdatedSettings(this._defaults, this._settings, key, value);
    this._serializedSettings = writeSettingsToDisk(this._settingsPath, this._settings);
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
    const nextState = reloadSettingsFromDisk(
      this._settingsPath,
      this._defaults,
      this._settings,
      this._serializedSettings,
    );
    if (!nextState) {
      return;
    }

    this._settings = nextState.settings;
    this._serializedSettings = nextState.serializedSettings;
    this._emit(nextState.changedKeys);
  }

  private _emit(changedKeys: string[]): void {
    const event = createChangeEvent(changedKeys);
    for (const listener of this._listeners) {
      listener(event);
    }
  }
}
