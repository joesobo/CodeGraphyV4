import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDefaultCodeGraphyRepoSettings } from '../../../../../src/extension/repoSettings/defaults';
import {
  createUpdatedSettings,
  readSettingsFromDisk,
  reloadSettingsFromDisk,
  writeSettingsToDisk,
} from '../../../../../src/extension/repoSettings/store/persistence/diskState';
import { serializeSettings } from '../../../../../src/extension/repoSettings/store/persistence/serialization';

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    readFileSync: vi.fn(actual.readFileSync),
    writeFileSync: vi.fn(actual.writeFileSync),
  };
});

function createTempSettingsPath(): string {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-store-state-'));
  return path.join(workspaceRoot, '.codegraphy', 'settings.json');
}

describe('extension/repoSettings/store/persistence/diskState', () => {
  const tempDirectories: string[] = [];

  afterEach(() => {
    vi.restoreAllMocks();
    for (const directory of tempDirectories.splice(0)) {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it('creates updated settings without mutating the previous state', () => {
    const defaults = createDefaultCodeGraphyRepoSettings();
    const settings = createDefaultCodeGraphyRepoSettings();

    const updated = createUpdatedSettings(defaults, settings, 'timeline.playbackSpeed', 2.5);

    expect(updated.timeline.playbackSpeed).toBe(2.5);
    expect(updated.timeline.maxCommits).toBe(500);
    expect(settings.timeline.playbackSpeed).toBe(1);
  });

  it('reads, normalizes, merges, and rewrites persisted settings when the shape changed', () => {
    const defaults = createDefaultCodeGraphyRepoSettings();
    const settingsPath = createTempSettingsPath();
    tempDirectories.push(path.dirname(path.dirname(settingsPath)));
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(settingsPath, JSON.stringify({
      maxFiles: 250,
      filterPatterns: ['**/*.png', '**/*.png'],
      exclude: ['legacy'],
      legend: [{ pattern: 'src/**', color: '#123456' }],
      edgeColors: { import: '#654321' },
      plugins: ['legacy.plugin'],
    }, null, 2), 'utf8');

    const state = readSettingsFromDisk(settingsPath, defaults);

    expect(state.settings.maxFiles).toBe(250);
    expect(state.settings.filterPatterns).toEqual(['**/*.png']);
    expect(state.settings.legend).toEqual([{ id: 'legend:node:src:1', pattern: 'src/**', color: '#123456' }]);
    expect(state.serializedSettings).toBe(fs.readFileSync(settingsPath, 'utf8'));
    expect(fs.readFileSync(settingsPath, 'utf8')).toContain('"legend"');
    expect(fs.readFileSync(settingsPath, 'utf8')).not.toContain('"exclude"');
    expect(fs.readFileSync(settingsPath, 'utf8')).not.toContain('"edgeColors"');
    expect(fs.readFileSync(settingsPath, 'utf8')).not.toContain('"plugins"');
  });

  it('reads an already-normalized settings file without rewriting it', () => {
    const defaults = createDefaultCodeGraphyRepoSettings();
    const settingsPath = createTempSettingsPath();
    const serializedDefaults = serializeSettings(defaults);
    tempDirectories.push(path.dirname(path.dirname(settingsPath)));
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(settingsPath, serializedDefaults, 'utf8');
    const readFileSyncMock = vi.mocked(fs.readFileSync);
    const writeFileSyncMock = vi.mocked(fs.writeFileSync);
    readFileSyncMock.mockClear();
    writeFileSyncMock.mockClear();

    const state = readSettingsFromDisk(settingsPath, defaults);

    expect(state).toEqual({
      serializedSettings: serializedDefaults,
      settings: defaults,
    });
    expect(readFileSyncMock).toHaveBeenCalledWith(settingsPath, 'utf8');
    expect(writeFileSyncMock).not.toHaveBeenCalled();
  });

  it('regenerates defaults when reading invalid settings files', () => {
    const defaults = createDefaultCodeGraphyRepoSettings();
    const settingsPath = createTempSettingsPath();
    tempDirectories.push(path.dirname(path.dirname(settingsPath)));
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(settingsPath, '{"maxFiles": }', 'utf8');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const writeFileSyncMock = vi.mocked(fs.writeFileSync);
    writeFileSyncMock.mockClear();

    const state = readSettingsFromDisk(settingsPath, defaults);

    expect(warnSpy).toHaveBeenCalledExactlyOnceWith(
      '[CodeGraphy] Failed to read .codegraphy/settings.json, regenerating defaults.',
      expect.any(SyntaxError),
    );
    expect(state.settings).toEqual(defaults);
    expect(state.serializedSettings).toBe(serializeSettings(defaults));
    expect(fs.readFileSync(settingsPath, 'utf8')).toBe(serializeSettings(defaults));
    expect(writeFileSyncMock).toHaveBeenCalledWith(settingsPath, serializeSettings(defaults), 'utf8');
  });

  it('writes settings and returns the serialized form', () => {
    const settings = createDefaultCodeGraphyRepoSettings();
    const settingsPath = createTempSettingsPath();
    tempDirectories.push(path.dirname(path.dirname(settingsPath)));
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    const writeFileSyncMock = vi.mocked(fs.writeFileSync);
    writeFileSyncMock.mockClear();

    const serialized = writeSettingsToDisk(settingsPath, settings);

    expect(serialized).toBe(serializeSettings(settings));
    expect(fs.readFileSync(settingsPath, 'utf8')).toBe(serialized);
    expect(writeFileSyncMock).toHaveBeenCalledWith(settingsPath, serialized, 'utf8');
  });

  it('reloads defaults when the persisted file disappears', () => {
    const defaults = createDefaultCodeGraphyRepoSettings();
    const previousSettings = { ...defaults, showOrphans: false };
    const settingsPath = createTempSettingsPath();
    tempDirectories.push(path.dirname(path.dirname(settingsPath)));
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });

    const nextState = reloadSettingsFromDisk(
      settingsPath,
      defaults,
      previousSettings,
      serializeSettings(previousSettings),
    );

    expect(nextState).toEqual({
      changedKeys: ['showOrphans'],
      serializedSettings: serializeSettings(defaults),
      settings: defaults,
    });
    expect(fs.readFileSync(settingsPath, 'utf8')).toBe(serializeSettings(defaults));
  });

  it('reloads defaults with a fallback change key when the missing file matches prior settings', () => {
    const defaults = createDefaultCodeGraphyRepoSettings();
    const settingsPath = createTempSettingsPath();
    tempDirectories.push(path.dirname(path.dirname(settingsPath)));
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });

    const nextState = reloadSettingsFromDisk(
      settingsPath,
      defaults,
      defaults,
      serializeSettings(defaults),
    );

    expect(nextState).toEqual({
      changedKeys: ['codegraphy'],
      serializedSettings: serializeSettings(defaults),
      settings: defaults,
    });
  });

  it('returns undefined when a reload sees the same serialized settings', () => {
    const settings = createDefaultCodeGraphyRepoSettings();
    const settingsPath = createTempSettingsPath();
    tempDirectories.push(path.dirname(path.dirname(settingsPath)));
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(settingsPath, serializeSettings(settings), 'utf8');

    expect(reloadSettingsFromDisk(
      settingsPath,
      settings,
      settings,
      serializeSettings(settings),
    )).toBeUndefined();
  });

  it('returns normalized settings and a fallback change key when only formatting changed', () => {
    const defaults = createDefaultCodeGraphyRepoSettings();
    const settingsPath = createTempSettingsPath();
    tempDirectories.push(path.dirname(path.dirname(settingsPath)));
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(settingsPath, `${JSON.stringify(defaults)}\n`, 'utf8');

    const nextState = reloadSettingsFromDisk(
      settingsPath,
      defaults,
      defaults,
      'stale-serialized-value',
    );

    expect(nextState).toEqual({
      changedKeys: ['codegraphy'],
      serializedSettings: serializeSettings(defaults),
      settings: defaults,
    });
  });

  it('ignores invalid reload saves and preserves the in-memory state', () => {
    const defaults = createDefaultCodeGraphyRepoSettings();
    const settingsPath = createTempSettingsPath();
    tempDirectories.push(path.dirname(path.dirname(settingsPath)));
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(settingsPath, '{"showOrphans": }', 'utf8');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(reloadSettingsFromDisk(
      settingsPath,
      defaults,
      defaults,
      'previous-serialized-value',
    )).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledExactlyOnceWith(
      '[CodeGraphy] Ignoring invalid .codegraphy/settings.json save.',
      expect.any(SyntaxError),
    );
  });
});
