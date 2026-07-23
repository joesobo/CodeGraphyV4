import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createPluginGraphWorkScheduler,
} from '../../../../../src/extension/graphView/webview/settingsMessages/pluginGraphWork';

describe('graph view plugin graph work scheduler', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('coalesces plugin-file refresh bursts into one debounced latest-state job', async () => {
    vi.useFakeTimers();
    const reprocessPluginFiles = vi.fn(() => Promise.resolve());
    const scheduler = createPluginGraphWorkScheduler({
      analyzeAndSendData: vi.fn(() => Promise.resolve()),
      reprocessPluginFiles,
      smartRebuild: vi.fn(),
    }, { delayMs: 50 });

    for (let index = 0; index < 10; index += 1) {
      scheduler.schedule({
        kind: 'reprocess-plugin-files',
        pluginIds: [`plugin-${index % 3}`],
      });
    }

    expect(reprocessPluginFiles).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(49);
    expect(reprocessPluginFiles).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);

    expect(reprocessPluginFiles).toHaveBeenCalledOnce();
    expect(reprocessPluginFiles).toHaveBeenCalledWith([
      'plugin-0',
      'plugin-1',
      'plugin-2',
    ]);
  });

  it('lets full workspace analysis supersede queued plugin-file refresh work', async () => {
    vi.useFakeTimers();
    const analyzeAndSendData = vi.fn(() => Promise.resolve());
    const reprocessPluginFiles = vi.fn(() => Promise.resolve());
    const scheduler = createPluginGraphWorkScheduler({
      analyzeAndSendData,
      reprocessPluginFiles,
      smartRebuild: vi.fn(),
    }, { delayMs: 50 });

    scheduler.schedule({ kind: 'reprocess-plugin-files', pluginIds: ['codegraphy.vue'] });
    scheduler.schedule({ kind: 'analyze-workspace' });

    await vi.advanceTimersByTimeAsync(50);

    expect(analyzeAndSendData).toHaveBeenCalledOnce();
    expect(reprocessPluginFiles).not.toHaveBeenCalled();
  });

  it('reports a rejected scheduled refresh without leaving an unhandled promise', async () => {
    vi.useFakeTimers();
    const error = new Error('refresh failed');
    const logError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const scheduler = createPluginGraphWorkScheduler({
      analyzeAndSendData: vi.fn(() => Promise.reject(error)),
      reprocessPluginFiles: vi.fn(() => Promise.resolve()),
      smartRebuild: vi.fn(),
    }, { delayMs: 50 });

    scheduler.schedule({ kind: 'analyze-workspace' });
    await vi.advanceTimersByTimeAsync(50);

    expect(logError).toHaveBeenCalledWith(
      '[CodeGraphy] Scheduled plugin graph refresh failed:',
      error,
    );
  });
});
