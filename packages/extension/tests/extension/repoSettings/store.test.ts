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

  it('creates .codegraphy/settings.json and seeds it from legacy configuration', () => {
    const workspaceRoot = createTempWorkspace();
    tempDirectories.push(workspaceRoot);

    const store = new CodeGraphyRepoSettingsStore(workspaceRoot, {
      get: <T>(key: string, defaultValue: T): T => {
        if (key === 'showOrphans') return false as T;
        if (key === 'timeline.maxCommits') return 123 as T;
        if (key === 'groups') {
          return [{ id: 'group.from-legacy', pattern: 'src/**', color: '#ffffff' }] as T;
        }
        return defaultValue;
      },
    });

    const settingsPath = path.join(workspaceRoot, '.codegraphy', 'settings.json');
    const persisted = readJson<Record<string, unknown>>(settingsPath);

    expect(store.get('showOrphans', true)).toBe(false);
    expect(store.get('timeline.maxCommits', 0)).toBe(123);
    expect(persisted.showOrphans).toBe(false);
    expect(persisted.timeline).toEqual({ maxCommits: 123, playbackSpeed: 1 });
    expect(persisted.legend).toEqual([{ id: 'group.from-legacy', pattern: 'src/**', color: '#ffffff' }]);
    expect(persisted.groups).toBeUndefined();
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

  it('reads the cleaner legend key and folder color from node colors', () => {
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
    expect(store.get('groups', [])).toEqual([
      { id: 'legend-rule', pattern: 'src/**', color: '#112233' },
    ]);
    expect(store.get('folderNodeColor', '')).toBe('#445566');
    expect(readJson<Record<string, unknown>>(store.settingsPath).folderNodeColor).toBeUndefined();
  });

  it('updates legend through the cleaner alias and persists only the legend key', async () => {
    const workspaceRoot = createTempWorkspace();
    tempDirectories.push(workspaceRoot);
    const store = new CodeGraphyRepoSettingsStore(workspaceRoot);
    const nextLegend = [{ id: 'legend-rule', pattern: 'tests/**', color: '#00ff00' }];

    await store.update('legend', nextLegend);

    const persisted = readJson<Record<string, unknown>>(store.settingsPath);
    expect(store.get('legend', [])).toEqual(nextLegend);
    expect(store.get('groups', [])).toEqual(nextLegend);
    expect(persisted.legend).toEqual(nextLegend);
    expect(persisted.groups).toBeUndefined();
  });

  it('merges legacy exclude entries into filterPatterns and rewrites the cleaner file shape', () => {
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
    const persisted = readJson<Record<string, unknown>>(store.settingsPath);

    expect(store.get('filterPatterns', [])).toEqual(['**/*.png', '**/*.tmp']);
    expect(store.get('exclude', [])).toEqual(['**/*.png', '**/*.tmp']);
    expect(persisted.filterPatterns).toEqual(['**/*.png', '**/*.tmp']);
    expect(persisted.exclude).toBeUndefined();
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
});
