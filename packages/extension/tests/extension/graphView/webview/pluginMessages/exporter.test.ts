import { describe, expect, it, vi } from 'vitest';
import { applyPluginExporterAction } from '../../../../../src/extension/graphView/webview/pluginMessages/exporter';

describe('graph view plugin exporter message', () => {
  it('runs the selected exporter', async () => {
    const run = vi.fn(() => Promise.resolve());

    await applyPluginExporterAction(
      { pluginId: 'test.plugin', index: 0 },
      {
        getPluginApi: () => ({ exporters: [{ run }] }),
        logError: vi.fn(),
      },
    );

    expect(run).toHaveBeenCalledOnce();
  });

  it('ignores missing plugin apis and out-of-range exporter indexes', async () => {
    const run = vi.fn();
    const logError = vi.fn();

    await applyPluginExporterAction(
      { pluginId: 'missing.plugin', index: 0 },
      {
        getPluginApi: () => undefined,
        logError,
      },
    );

    await applyPluginExporterAction(
      { pluginId: 'test.plugin', index: 2 },
      {
        getPluginApi: () => ({ exporters: [{ run }] }),
        logError,
      },
    );

    expect(run).not.toHaveBeenCalled();
    expect(logError).not.toHaveBeenCalled();
  });

  it('logs exporter failures', async () => {
    const error = new Error('boom');
    const logError = vi.fn();

    await applyPluginExporterAction(
      { pluginId: 'test.plugin', index: 0 },
      {
        getPluginApi: () => ({
          exporters: [{ run: vi.fn(() => Promise.reject(error)) }],
        }),
        logError,
      },
    );

    expect(logError).toHaveBeenCalledWith('[CodeGraphy] Plugin export action error:', error);
  });
});
