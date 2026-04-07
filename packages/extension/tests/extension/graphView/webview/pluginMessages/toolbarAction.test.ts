import { describe, expect, it, vi } from 'vitest';
import { applyPluginToolbarAction } from '../../../../../src/extension/graphView/webview/pluginMessages/toolbarAction';

describe('graph view plugin toolbar action message', () => {
  it('runs the selected toolbar action item', async () => {
    const run = vi.fn(() => Promise.resolve());

    await applyPluginToolbarAction(
      { pluginId: 'test.plugin', index: 0, itemIndex: 1 },
      {
        getPluginApi: () => ({
          toolbarActions: [{ items: [{ run: vi.fn() }, { run }] }],
        }),
        logError: vi.fn(),
      },
    );

    expect(run).toHaveBeenCalledOnce();
  });

  it('ignores missing plugin apis and out-of-range toolbar indexes', async () => {
    const run = vi.fn();
    const logError = vi.fn();

    await applyPluginToolbarAction(
      { pluginId: 'missing.plugin', index: 0, itemIndex: 0 },
      {
        getPluginApi: () => undefined,
        logError,
      },
    );

    await applyPluginToolbarAction(
      { pluginId: 'test.plugin', index: 1, itemIndex: 0 },
      {
        getPluginApi: () => ({ toolbarActions: [{ items: [{ run }] }] }),
        logError,
      },
    );

    expect(run).not.toHaveBeenCalled();
    expect(logError).not.toHaveBeenCalled();
  });

  it('ignores missing toolbar items without logging errors', async () => {
    const logError = vi.fn();

    await applyPluginToolbarAction(
      { pluginId: 'test.plugin', index: 0, itemIndex: 3 },
      {
        getPluginApi: () => ({ toolbarActions: [{ items: [{ run: vi.fn() }] }] }),
        logError,
      },
    );

    expect(logError).not.toHaveBeenCalled();
  });

  it('logs action failures', async () => {
    const error = new Error('boom');
    const logError = vi.fn();
    const run = vi.fn(() => Promise.reject(error));

    await applyPluginToolbarAction(
      { pluginId: 'test.plugin', index: 0, itemIndex: 0 },
      {
        getPluginApi: () => ({ toolbarActions: [{ items: [{ run }] }] }),
        logError,
      },
    );

    expect(logError).toHaveBeenCalledWith('[CodeGraphy] Plugin toolbar action error:', error);
  });
});
