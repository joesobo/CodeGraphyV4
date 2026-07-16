import * as fs from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  CodeGraphyRepoSettingsStore,
  type ICodeGraphySettingsChangeEvent,
} from '../../../../src/extension/repoSettings/store';
import { createSettingsWithOverrides, createTempWorkspace } from './fixture';

describe('extension/repoSettings/store change notifications', () => {
  it('reloads manual file edits and emits a change event', () => {
    const workspaceRoot = createTempWorkspace();
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


  it('ignores invalid manual saves and keeps the last valid settings in memory', () => {
    const workspaceRoot = createTempWorkspace();
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


  it('reports explicit and parent-child matches through affectsConfiguration', async () => {
    const workspaceRoot = createTempWorkspace();
    const store = new CodeGraphyRepoSettingsStore(workspaceRoot);
    const events: ICodeGraphySettingsChangeEvent[] = [];

    store.onDidChange((event) => {
      events.push(event);
    });

    await store.update('legend', [{ id: 'legend-rule', pattern: 'src/**', color: '#abcdef' }]);
    await store.update('physics.damping', 0.4);
    await store.update('nodeColors', { folder: '#123456' });

    expect(events[0].affectsConfiguration('codegraphy')).toBe(true);
    expect(events[0].affectsConfiguration('codegraphy.legend')).toBe(true);
    expect(events[0].affectsConfiguration('codegraphy.groups')).toBe(false);
    expect(events[0].affectsConfiguration('workbench.colorTheme')).toBe(false);

    expect(events[1].affectsConfiguration('codegraphy.physics')).toBe(true);
    expect(events[1].affectsConfiguration('codegraphy.physics.damping')).toBe(true);

    expect(events[2].affectsConfiguration('codegraphy.folderNodeColor')).toBe(false);
    expect(events[2].affectsConfiguration('codegraphy.nodeColors')).toBe(true);
  });


  it('stops notifying a listener after it is disposed', async () => {
    const workspaceRoot = createTempWorkspace();
    const store = new CodeGraphyRepoSettingsStore(workspaceRoot);
    const listener = vi.fn();

    const subscription = store.onDidChange(listener);
    subscription.dispose();

    await store.update('maxFiles', 900);

    expect(listener).not.toHaveBeenCalled();
  });

});
