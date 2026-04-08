import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createDefaultCodeGraphyRepoSettings } from '../../../src/extension/repoSettings/defaults';
import {
  CodeGraphyRepoSettingsStore,
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
    expect(persisted.groups).toEqual([{ id: 'group.from-legacy', pattern: 'src/**', color: '#ffffff' }]);
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
    expect(changes).toEqual([['codegraphy']]);
  });
});
