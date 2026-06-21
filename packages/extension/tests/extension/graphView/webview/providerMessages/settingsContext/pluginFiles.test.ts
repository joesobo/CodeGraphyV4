import { describe, expect, it, vi } from 'vitest';
import { reprocessPluginFiles } from '../../../../../../src/extension/graphView/webview/providerMessages/settingsContext/pluginFiles';

describe('graph view provider settings context plugin files', () => {
  it('refreshes plugin files through the scoped plugin refresh when available', async () => {
    const refreshPluginFiles = vi.fn(() => Promise.resolve());
    const refreshChangedFiles = vi.fn(() => Promise.resolve());
    const invalidatePluginFiles = vi.fn(() => ['src/a.ts']);

    await reprocessPluginFiles(
      {
        refreshPluginFiles,
        refreshChangedFiles,
        invalidatePluginFiles,
        _analyzeAndSendData: vi.fn(() => Promise.resolve()),
      } as never,
      ['codegraphy.vue'],
    );

    expect(refreshPluginFiles).toHaveBeenCalledWith(['codegraphy.vue']);
    expect(invalidatePluginFiles).not.toHaveBeenCalled();
    expect(refreshChangedFiles).not.toHaveBeenCalled();
  });

  it('refreshes only the invalidated plugin files when any are reported', async () => {
    const refreshChangedFiles = vi.fn(() => Promise.resolve());
    const analyzeAndSendData = vi.fn(() => Promise.resolve());
    const invalidatePluginFiles = vi.fn(() => ['src/a.ts', 'src/b.ts']);

    await reprocessPluginFiles(
      {
        refreshChangedFiles,
        invalidatePluginFiles,
        _analyzeAndSendData: analyzeAndSendData,
      } as never,
      ['codegraphy.vue'],
    );

    expect(invalidatePluginFiles).toHaveBeenCalledWith(['codegraphy.vue']);
    expect(refreshChangedFiles).toHaveBeenCalledWith(['src/a.ts', 'src/b.ts']);
    expect(analyzeAndSendData).not.toHaveBeenCalled();
  });

  it('skips all follow-up work when invalidation returns an empty file list', async () => {
    const refreshChangedFiles = vi.fn(() => Promise.resolve());
    const analyzeAndSendData = vi.fn(() => Promise.resolve());
    const invalidatePluginFiles = vi.fn(() => []);

    await reprocessPluginFiles(
      {
        refreshChangedFiles,
        invalidatePluginFiles,
        _analyzeAndSendData: analyzeAndSendData,
      } as never,
      ['codegraphy.vue'],
    );

    expect(refreshChangedFiles).not.toHaveBeenCalled();
    expect(analyzeAndSendData).not.toHaveBeenCalled();
  });

  it('falls back to full analysis when plugin invalidation is unavailable', async () => {
    const refreshChangedFiles = vi.fn(() => Promise.resolve());
    const analyzeAndSendData = vi.fn(() => Promise.resolve());

    await reprocessPluginFiles(
      {
        refreshChangedFiles,
        _analyzeAndSendData: analyzeAndSendData,
      } as never,
      ['codegraphy.vue'],
    );

    expect(refreshChangedFiles).not.toHaveBeenCalled();
    expect(analyzeAndSendData).toHaveBeenCalledOnce();
  });
});
