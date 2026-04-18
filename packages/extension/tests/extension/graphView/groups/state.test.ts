import { describe, expect, it } from 'vitest';
import type { IGroup } from '../../../../src/shared/settings/groups';
import { loadGraphViewGroupState } from '../../../../src/extension/graphView/groups/state';

interface MockInspectResult<T> {
  workspaceValue?: T;
  globalValue?: T;
}

function createConfig(options?: {
  inspected?: Record<string, MockInspectResult<unknown> | undefined>;
}) {
  const inspected = options?.inspected ?? {};

  return {
    get<T>(section: string, defaultValue: T): T {
      return defaultValue;
    },
    inspect<T>(section: string): MockInspectResult<T> | undefined {
      return inspected[section] as MockInspectResult<T> | undefined;
    },
  };
}

describe('graphView/groupState', () => {
  it('prefers configured groups and filter patterns from config inspection', () => {
    const configuredGroups: IGroup[] = [
      { id: 'configured', pattern: 'src/**', color: '#112233' },
    ];

    const state = loadGraphViewGroupState(
      createConfig({
        inspected: {
          legend: { workspaceValue: configuredGroups },
          filterPatterns: { globalValue: ['dist/**'] },
        },
      }),
    );

    expect(state.userGroups).toEqual(configuredGroups);
    expect(state.filterPatterns).toEqual(['dist/**']);
  });

  it('uses configured groups with an empty filter list when no filter patterns are configured', () => {
    const configuredGroups: IGroup[] = [
      { id: 'configured', pattern: 'src/**', color: '#112233' },
    ];

    const state = loadGraphViewGroupState(
      createConfig({
        inspected: {
          legend: { globalValue: configuredGroups },
        },
      }),
    );

    expect(state.userGroups).toEqual(configuredGroups);
    expect(state.filterPatterns).toEqual([]);
  });

  it('defaults configured groups to empty filter and hidden-group collections', () => {
    const configuredGroups: IGroup[] = [
      { id: 'configured', pattern: 'src/**', color: '#112233' },
    ];

    const state = loadGraphViewGroupState(
      createConfig({
        inspected: {
          legend: { workspaceValue: configuredGroups },
        },
      }),
    );

    expect(state.userGroups).toEqual(configuredGroups);
    expect(state.filterPatterns).toEqual([]);
  });

  it('returns configured filter patterns when no groups are configured', () => {
    const state = loadGraphViewGroupState(
      createConfig({
        inspected: {
          filterPatterns: { workspaceValue: ['coverage/**'] },
        },
      }),
    );

    expect(state.userGroups).toEqual([]);
    expect(state.filterPatterns).toEqual(['coverage/**']);
  });

  it('returns empty state when no groups or filters have been configured', () => {
    const state = loadGraphViewGroupState(createConfig());

    expect(state.userGroups).toEqual([]);
    expect(state.filterPatterns).toEqual([]);
  });
});
