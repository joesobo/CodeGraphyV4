import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createDefaultCodeGraphyRepoSettings } from '../../../src/extension/repoSettings/defaults';
import {
  CodeGraphyRepoSettingsStore,
  type ICodeGraphySettingsChangeEvent,
} from '../../../src/extension/repoSettings/store';

function createTempWorkspace(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-settings-'));
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function createSettingsWithOverrides(overrides: Partial<ReturnType<typeof createDefaultCodeGraphyRepoSettings>>) {
  return {
    ...createDefaultCodeGraphyRepoSettings(),
    ...overrides,
  };
}

describe('extension/repoSettings/store', () => {
  const tempDirectories: string[] = [];

  afterEach(() => {
    for (const directory of tempDirectories.splice(0)) {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it('creates .codegraphy/settings.json from defaults instead of seeding legacy configuration', () => {
    const workspaceRoot = createTempWorkspace();
    tempDirectories.push(workspaceRoot);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const store = new CodeGraphyRepoSettingsStore(workspaceRoot);

    const settingsPath = path.join(workspaceRoot, '.codegraphy', 'settings.json');
    const persisted = readJson<Record<string, unknown>>(settingsPath);

    expect(store.workspaceRoot).toBe(workspaceRoot);
    expect(store.settingsPath).toBe(settingsPath);
    expect(store.get('showOrphans', true)).toBe(true);
    expect(store.get('timeline.maxCommits', 0)).toBe(500);
    expect(persisted.showOrphans).toBe(true);
    expect(persisted.timeline).toEqual({ maxCommits: 500, playbackSpeed: 1 });
    expect(persisted.legend).toEqual([]);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('creates .gitignore when missing and adds .codegraphy/ once', () => {
    const workspaceRoot = createTempWorkspace();
    tempDirectories.push(workspaceRoot);

    new CodeGraphyRepoSettingsStore(workspaceRoot);
    new CodeGraphyRepoSettingsStore(workspaceRoot);

    const gitIgnorePath = path.join(workspaceRoot, '.gitignore');
    expect(fs.readFileSync(gitIgnorePath, 'utf8')).toBe('.codegraphy/\n');
  });

  it('updates nested settings keys and persists the result', async () => {
    const workspaceRoot = createTempWorkspace();
    tempDirectories.push(workspaceRoot);
    const store = new CodeGraphyRepoSettingsStore(workspaceRoot);

    await store.update('timeline.playbackSpeed', 2.5);
    await store.update('physics.chargeRange', 450);

    const persisted = readJson<Record<string, unknown>>(store.settingsPath);
    expect(store.get('timeline.playbackSpeed', 0)).toBe(2.5);
    expect(store.get('physics.chargeRange', 0)).toBe(450);
    expect(persisted.timeline).toEqual({ maxCommits: 500, playbackSpeed: 2.5 });
    expect(persisted.physics).toEqual({
      repelForce: 10,
      linkDistance: 80,
      linkForce: 0.15,
      damping: 0.7,
      centerForce: 0.1,
      chargeRange: 450,
    });
  });

  it('persists silent updates without emitting a change event', async () => {
    const workspaceRoot = createTempWorkspace();
    tempDirectories.push(workspaceRoot);
    const store = new CodeGraphyRepoSettingsStore(workspaceRoot);
    const changes: string[][] = [];
    store.onDidChange(event => {
      changes.push(event.changedKeys);
    });

    await store.updateSilently('disabledPlugins', ['codegraphy.python']);

    const persisted = readJson<Record<string, unknown>>(store.settingsPath);
    expect(store.get('disabledPlugins', [])).toEqual(['codegraphy.python']);
    expect(persisted.disabledPlugins).toEqual(['codegraphy.python']);
    expect(changes).toEqual([]);
  });

  it('reloads manual file edits and emits a change event', () => {
    const workspaceRoot = createTempWorkspace();
    tempDirectories.push(workspaceRoot);
    const store = new CodeGraphyRepoSettingsStore(workspaceRoot);
    const changes: string[][] = [];
    store.onDidChange(event => {
      changes.push(event.changedKeys);
    });

    fs.writeFileSync(
      store.settingsPath,
      JSON.stringify(createSettingsWithOverrides({ maxFiles: 900 }), null, 2),
      'utf8',
    );

    store.reload();

    expect(store.get('maxFiles', 0)).toBe(900);
    expect(changes).toEqual([['maxFiles']]);
  });

  it('emits nested keys for manual edits to nested settings', () => {
    const workspaceRoot = createTempWorkspace();
    tempDirectories.push(workspaceRoot);
    const store = new CodeGraphyRepoSettingsStore(workspaceRoot);
    const changes: string[][] = [];
    store.onDidChange(event => {
      changes.push(event.changedKeys);
    });

    fs.writeFileSync(
      store.settingsPath,
      JSON.stringify(createSettingsWithOverrides({
        timeline: { maxCommits: 500, playbackSpeed: 2 },
      }), null, 2),
      'utf8',
    );

    store.reload();

    expect(store.get('timeline.playbackSpeed', 0)).toBe(2);
    expect(changes).toEqual([['timeline.playbackSpeed']]);
  });

  it('reads persisted legend and node colors without legacy key aliases', () => {
    const workspaceRoot = createTempWorkspace();
    tempDirectories.push(workspaceRoot);
    const settingsPath = path.join(workspaceRoot, '.codegraphy', 'settings.json');
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(
      settingsPath,
      JSON.stringify({
        ...createSettingsWithOverrides({}),
        legend: [{ id: 'legend-rule', pattern: 'src/**', color: '#112233' }],
        nodeColors: { file: '#999999', folder: '#445566' },
      }, null, 2),
      'utf8',
    );

    const store = new CodeGraphyRepoSettingsStore(workspaceRoot);

    expect(store.get('legend', [])).toEqual([
      { id: 'legend-rule', pattern: 'src/**', color: '#112233' },
    ]);
    expect(store.get('nodeColors', {})).toEqual(expect.objectContaining({
      file: '#999999',
      folder: '#445566',
    }));
  });

  it('updates legend and persists only the legend key', async () => {
    const workspaceRoot = createTempWorkspace();
    tempDirectories.push(workspaceRoot);
    const store = new CodeGraphyRepoSettingsStore(workspaceRoot);
    const nextLegend = [{ id: 'legend-rule', pattern: 'tests/**', color: '#00ff00' }];

    await store.update('legend', nextLegend);

    const persisted = readJson<Record<string, unknown>>(store.settingsPath);
    expect(store.get('legend', [])).toEqual(nextLegend);
    expect(persisted.legend).toEqual(nextLegend);
  });

  it('ignores legacy exclude entries in persisted settings files', () => {
    const workspaceRoot = createTempWorkspace();
    tempDirectories.push(workspaceRoot);
    const settingsPath = path.join(workspaceRoot, '.codegraphy', 'settings.json');
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(
      settingsPath,
      JSON.stringify({
        ...createSettingsWithOverrides({}),
        filterPatterns: ['**/*.png'],
        exclude: ['**/*.tmp', '**/*.png'],
      }, null, 2),
      'utf8',
    );

    const store = new CodeGraphyRepoSettingsStore(workspaceRoot);

    expect(store.get('filterPatterns', [])).toEqual(['**/*.png']);
  });

  it('ignores invalid manual saves and keeps the last valid settings in memory', () => {
    const workspaceRoot = createTempWorkspace();
    tempDirectories.push(workspaceRoot);
    const store = new CodeGraphyRepoSettingsStore(workspaceRoot);
    const changes: string[][] = [];
    store.onDidChange(event => {
      changes.push(event.changedKeys);
    });

    fs.writeFileSync(
      store.settingsPath,
      JSON.stringify(createSettingsWithOverrides({ maxFiles: 900 }), null, 2),
      'utf8',
    );
    store.reload();

    fs.writeFileSync(store.settingsPath, '{"maxFiles": }', 'utf8');
    expect(() => store.reload()).not.toThrow();

    expect(store.get('maxFiles', 0)).toBe(900);
    expect(changes).toEqual([['maxFiles']]);
  });

  it('prefers existing legend and node color entries over legacy aliases while cleaning excludes', () => {
    const workspaceRoot = createTempWorkspace();
    tempDirectories.push(workspaceRoot);
    const settingsPath = path.join(workspaceRoot, '.codegraphy', 'settings.json');
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(
      settingsPath,
      JSON.stringify({
        ...createSettingsWithOverrides({}),
        legend: [{ id: 'legend-rule', pattern: 'src/**', color: '#112233' }],
        groups: [{ id: 'legacy-group', pattern: 'legacy/**', color: '#ffffff' }],
        nodeColors: { folder: '#445566', file: '#999999' },
        folderNodeColor: '#000000',
        filterPatterns: ['**/*.png'],
        exclude: ['**/*.png', 42],
      }, null, 2),
      'utf8',
    );

    const store = new CodeGraphyRepoSettingsStore(workspaceRoot);
    const persisted = readJson<Record<string, unknown>>(store.settingsPath);

    expect(store.get('legend', [])).toEqual([
      { id: 'legend-rule', pattern: 'src/**', color: '#112233' },
    ]);
    expect(store.get('folderNodeColor', '')).toBe('#445566');
    expect(persisted.legend).toEqual([
      { id: 'legend-rule', pattern: 'src/**', color: '#112233' },
    ]);
    expect(persisted.nodeColors).toEqual(expect.objectContaining({
      folder: '#445566',
      file: '#999999',
    }));
    expect(persisted.exclude).toBeUndefined();
    expect(persisted.filterPatterns).toEqual(['**/*.png']);
  });

  it('falls back to defaults when persisted settings are a non-object JSON value', () => {
    const workspaceRoot = createTempWorkspace();
    tempDirectories.push(workspaceRoot);
    const settingsPath = path.join(workspaceRoot, '.codegraphy', 'settings.json');
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(settingsPath, '[]\n', 'utf8');

    const store = new CodeGraphyRepoSettingsStore(workspaceRoot);

    expect(store.get('legend', [])).toEqual([]);
    expect(store.get('filterPatterns', [])).toEqual([]);
    expect(readJson<Record<string, unknown>>(store.settingsPath)).toEqual(
      createDefaultCodeGraphyRepoSettings(),
    );
  });

  it('reports alias and parent-child matches through affectsConfiguration', async () => {
    const workspaceRoot = createTempWorkspace();
    tempDirectories.push(workspaceRoot);
    const store = new CodeGraphyRepoSettingsStore(workspaceRoot);
    const events: ICodeGraphySettingsChangeEvent[] = [];

    store.onDidChange((event) => {
      events.push(event);
    });

    await store.update('legend', [{ id: 'legend-rule', pattern: 'src/**', color: '#abcdef' }]);
    await store.update('timeline.playbackSpeed', 3);
    await store.update('nodeColors', { folder: '#123456' });

    expect(events[0].affectsConfiguration('codegraphy')).toBe(true);
    expect(events[0].affectsConfiguration('codegraphy.groups')).toBe(true);
    expect(events[0].affectsConfiguration('workbench.colorTheme')).toBe(false);

    expect(events[1].affectsConfiguration('codegraphy.timeline')).toBe(true);
    expect(events[1].affectsConfiguration('codegraphy.timeline.playbackSpeed')).toBe(true);

    expect(events[2].affectsConfiguration('codegraphy.folderNodeColor')).toBe(true);
    expect(events[2].affectsConfiguration('codegraphy.nodeColors')).toBe(true);
  });

  it('inspects default and workspace values for nested keys', async () => {
    const workspaceRoot = createTempWorkspace();
    tempDirectories.push(workspaceRoot);
    const store = new CodeGraphyRepoSettingsStore(workspaceRoot);

    expect(store.inspect<number>('timeline.playbackSpeed')).toEqual({
      defaultValue: 1,
      workspaceValue: 1,
    });

    await store.update('timeline.playbackSpeed', 3);

    expect(store.inspect<number>('timeline.playbackSpeed')).toEqual({
      defaultValue: 1,
      workspaceValue: 3,
    });
    expect(store.inspect<string>('timeline.unknown')).toEqual({
      defaultValue: undefined,
      workspaceValue: undefined,
    });
  });

  it('stops notifying a listener after it is disposed', async () => {
    const workspaceRoot = createTempWorkspace();
    tempDirectories.push(workspaceRoot);
    const store = new CodeGraphyRepoSettingsStore(workspaceRoot);
    const listener = vi.fn();

    const subscription = store.onDidChange(listener);
    subscription.dispose();

    await store.update('maxFiles', 900);

    expect(listener).not.toHaveBeenCalled();
  });
});
