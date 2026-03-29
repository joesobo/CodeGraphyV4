import { describe, expect, it, vi } from 'vitest';
import {
  dispatchGraphViewPluginGroupToggleMessage,
  dispatchGraphViewPluginSectionToggleMessage,
  type GraphViewPluginHiddenGroupsContext,
} from '../../../../../src/extension/graphView/webview/dispatch/pluginHiddenGroups';

function createContext(
  hiddenPluginGroupIds = new Set<string>(),
  overrides: Partial<GraphViewPluginHiddenGroupsContext> = {},
): GraphViewPluginHiddenGroupsContext {
  return {
    getHiddenPluginGroupIds: vi.fn(() => hiddenPluginGroupIds),
    updateHiddenPluginGroups: vi.fn(() => Promise.resolve()),
    recomputeGroups: vi.fn(),
    sendGroupsUpdated: vi.fn(),
    ...overrides,
  };
}

describe('dispatchGraphViewPluginGroupToggleMessage', () => {
  it('adds a disabled group id and refreshes the groups payload', async () => {
    const hiddenPluginGroupIds = new Set<string>();
    const context = createContext(hiddenPluginGroupIds);

    await expect(
      dispatchGraphViewPluginGroupToggleMessage(
        { type: 'TOGGLE_PLUGIN_GROUP_DISABLED', payload: { groupId: 'plugin:test:lint', disabled: true } },
        context,
      ),
    ).resolves.toBeUndefined();

    expect(hiddenPluginGroupIds.has('plugin:test:lint')).toBe(true);
    expect(context.updateHiddenPluginGroups).toHaveBeenCalledWith(['plugin:test:lint']);
    expect(context.recomputeGroups).toHaveBeenCalledOnce();
    expect(context.sendGroupsUpdated).toHaveBeenCalledOnce();
  });
});

describe('dispatchGraphViewPluginSectionToggleMessage', () => {
  it('removes a section id and nested group ids when re-enabled', async () => {
    const hiddenPluginGroupIds = new Set<string>(['plugin:test', 'plugin:test:lint']);
    const context = createContext(hiddenPluginGroupIds);

    await expect(
      dispatchGraphViewPluginSectionToggleMessage(
        { type: 'TOGGLE_PLUGIN_SECTION_DISABLED', payload: { pluginId: 'test', disabled: false } },
        context,
      ),
    ).resolves.toBeUndefined();

    expect(hiddenPluginGroupIds.size).toBe(0);
    expect(context.updateHiddenPluginGroups).toHaveBeenCalledWith([]);
    expect(context.recomputeGroups).toHaveBeenCalledOnce();
    expect(context.sendGroupsUpdated).toHaveBeenCalledOnce();
  });
});
