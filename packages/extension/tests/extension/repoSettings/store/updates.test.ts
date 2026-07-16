import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CodeGraphyRepoSettingsStore } from '../../../../src/extension/repoSettings/store';
import { createSettingsWithOverrides, createTempWorkspace, readJson } from './fixture';

describe('extension/repoSettings/store updates', () => {
  it('updates nested settings keys and persists the result', async () => {
    const workspaceRoot = createTempWorkspace();
    const store = new CodeGraphyRepoSettingsStore(workspaceRoot);

    await store.update('physics.linkDistance', 450);

    const persisted = readJson<Record<string, unknown>>(store.settingsPath);
    expect(store.get('physics.linkDistance', 0)).toBe(450);
    expect(persisted.physics).toEqual({
      repelForce: 10,
      linkDistance: 450,
      linkForce: 1,
      damping: 0.4,
      centerForce: 0.1,
    });
  });


  it('persists silent updates without emitting a change event', async () => {
    const workspaceRoot = createTempWorkspace();
    const store = new CodeGraphyRepoSettingsStore(workspaceRoot);
    const changes: string[][] = [];
    store.onDidChange(event => {
      changes.push(event.changedKeys);
    });

    await store.updateSilently('plugins', [{ id: 'codegraphy.vue', enabled: true }]);

    const persisted = readJson<Record<string, unknown>>(store.settingsPath);
    expect(store.get('plugins', [])).toEqual([{ id: 'codegraphy.vue', enabled: true }]);
    expect(persisted.plugins).toEqual([{ id: 'codegraphy.vue', enabled: true }]);
    expect(changes).toEqual([]);
  });


  it('preserves plugin-owned data when silently toggling workspace plugins', async () => {
    const workspaceRoot = createTempWorkspace();
    const settingsPath = path.join(workspaceRoot, '.codegraphy', 'settings.json');
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(
      settingsPath,
      JSON.stringify({
        ...createSettingsWithOverrides({}),
        plugins: [
          { id: 'codegraphy.markdown', enabled: true },
          { id: 'codegraphy.organize', enabled: true },
        ],
        pluginData: {
          'codegraphy.organize': {
            sections: {
              'section-ui': { id: 'section-ui', label: 'UI' },
            },
          },
        },
      }, null, 2),
      'utf8',
    );
    const store = new CodeGraphyRepoSettingsStore(workspaceRoot);

    await store.updateSilently('plugins', [{ id: 'codegraphy.markdown', enabled: true }]);

    const persisted = readJson<Record<string, unknown>>(store.settingsPath);
    expect(persisted.pluginData).toEqual({
      'codegraphy.organize': {
        sections: {
          'section-ui': { id: 'section-ui', label: 'UI' },
        },
      },
    });
  });


  it('updates legend and persists only the legend key', async () => {
    const workspaceRoot = createTempWorkspace();
    const store = new CodeGraphyRepoSettingsStore(workspaceRoot);
    const nextLegend = [{ id: 'legend-rule', pattern: 'tests/**', color: '#00ff00' }];

    await store.update('legend', nextLegend);

    const persisted = readJson<Record<string, unknown>>(store.settingsPath);
    expect(store.get('legend', [])).toEqual(nextLegend);
    expect(persisted.legend).toEqual([{ pattern: 'tests/**', color: '#00ff00' }]);
  });


  it('inspects default and workspace values for nested keys', async () => {
    const workspaceRoot = createTempWorkspace();
    const store = new CodeGraphyRepoSettingsStore(workspaceRoot);

    expect(store.inspect<number>('physics.damping')).toEqual({
      defaultValue: 0.4,
      workspaceValue: 0.4,
    });

    await store.update('physics.damping', 0.2);

    expect(store.inspect<number>('physics.damping')).toEqual({
      defaultValue: 0.4,
      workspaceValue: 0.2,
    });
    expect(store.inspect<string>('physics.unknown')).toEqual({
      defaultValue: undefined,
      workspaceValue: undefined,
    });
  });

});
