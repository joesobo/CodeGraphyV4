import { describe, expect, it } from 'vitest';
import type { IGroup } from '../../../src/shared/types';
import { loadGraphViewGroupState } from '../../../src/extension/graphView/groupState';

interface MockInspectResult<T> {
  workspaceValue?: T;
  globalValue?: T;
}

function createConfig(options?: {
  hiddenPluginGroups?: string[];
  inspected?: Record<string, MockInspectResult<unknown> | undefined>;
}) {
  const inspected = options?.inspected ?? {};
  const hiddenPluginGroups = options?.hiddenPluginGroups ?? [];

  return {
    get<T>(section: string, defaultValue: T): T {
      if (section === 'hiddenPluginGroups') {
        return hiddenPluginGroups as T;
      }

      return defaultValue;
    },
    inspect<T>(section: string): MockInspectResult<T> | undefined {
      return inspected[section] as MockInspectResult<T> | undefined;
    },
  };
}

function createWorkspaceState(values: Record<string, unknown>) {
  return {
    get<T>(key: string): T | undefined {
      return values[key] as T | undefined;
    },
  };
}

describe('graphView/groupState', () => {
  it('prefers configured groups and filter patterns over legacy workspace state', () => {
    const configuredGroups: IGroup[] = [
      { id: 'configured', pattern: 'src/**', color: '#112233' },
    ];

    const state = loadGraphViewGroupState(
      createConfig({
        hiddenPluginGroups: ['plugin:codegraphy.typescript'],
        inspected: {
          groups: { workspaceValue: configuredGroups },
          filterPatterns: { globalValue: ['dist/**'] },
        },
      }),
      createWorkspaceState({
        'codegraphy.groups': [{ id: 'legacy', pattern: '**/*', color: '#000000' }],
        'codegraphy.filterPatterns': ['coverage/**'],
      }),
    );

    expect(state.userGroups).toEqual(configuredGroups);
    expect(state.filterPatterns).toEqual(['dist/**']);
    expect([...state.hiddenPluginGroupIds]).toEqual(['plugin:codegraphy.typescript']);
    expect(state.legacyGroupsToMigrate).toBeUndefined();
  });

  it('falls back to legacy groups, filters out plugin groups, and requests migration', () => {
    const state = loadGraphViewGroupState(
      createConfig(),
      createWorkspaceState({
        'codegraphy.groups': [
          { id: 'user', pattern: 'src/**', color: '#112233' },
          { id: 'plugin:codegraphy.python:*.py', pattern: '*.py', color: '#445566' },
        ],
        'codegraphy.filterPatterns': ['coverage/**'],
      }),
    );

    expect(state.userGroups).toEqual([
      { id: 'user', pattern: 'src/**', color: '#112233' },
    ]);
    expect(state.legacyGroupsToMigrate).toEqual([
      { id: 'user', pattern: 'src/**', color: '#112233' },
    ]);
    expect(state.filterPatterns).toEqual(['coverage/**']);
  });
});
