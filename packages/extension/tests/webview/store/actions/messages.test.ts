import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHarness, getActionHarness } from './harness';

describe('webview/store/actions/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes a known extension message through the matching message handler', () => {
    const { actions, getState } = createHarness();

    actions.handleExtensionMessage({
      type: 'MAX_FILES_UPDATED',
      payload: { maxFiles: 1_500 },
    });

    expect(getState().maxFiles).toBe(1_500);
  });

  it('passes the current state and postMessage function to extension message handlers', () => {
    const { actions } = createHarness({ depthMode: false, graphHasIndex: true });

    actions.handleExtensionMessage({ type: 'TOGGLE_DEPTH_MODE' });

    expect(getActionHarness().postMessage).toHaveBeenCalledWith({
      type: 'UPDATE_DEPTH_MODE',
      payload: { depthMode: true },
    });
  });

  it('does not update the store when a known extension message has no state update', () => {
    const { actions, set } = createHarness();

    actions.handleExtensionMessage({
      type: 'PLUGIN_WEBVIEW_INJECT',
      payload: { pluginId: 'acme.plugin', scripts: [], styles: [] },
    });

    expect(set).not.toHaveBeenCalled();
  });

  it('ignores unknown extension messages without mutating state', () => {
    const { actions, getState } = createHarness();
    const previousState = getState();

    actions.handleExtensionMessage({ type: 'UNKNOWN_MESSAGE' } as never);

    expect(getState()).toBe(previousState);
  });
});
