import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';

vi.mock('../../../src/extension/export/fileSave', async () => {
  const actual = await vi.importActual<typeof import('../../../src/extension/export/fileSave')>(
    '../../../src/extension/export/fileSave'
  );

  return {
    ...actual,
    saveExportBuffer: vi.fn(),
  };
});

import { saveExportBuffer } from '../../../src/extension/export/fileSave';
import { savePluginExport } from '../../../src/extension/export/pluginSave';

describe('pluginSave', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (vscode.window as Record<string, unknown>).showErrorMessage = vi.fn();
  });

  it('passes string content through the shared save flow as utf-8', async () => {
    vi.mocked(saveExportBuffer).mockResolvedValue(undefined);

    await savePluginExport({
      filename: 'graph.custom',
      content: 'hello graph',
      title: 'Export Custom Graph',
      successMessage: 'Saved custom graph',
      filters: { 'Custom Files': ['custom'] },
    });

    const [buffer, options] = vi.mocked(saveExportBuffer).mock.calls[0];
    expect(Buffer.from(buffer).toString('utf-8')).toBe('hello graph');
    expect(options).toEqual({
      defaultFilename: 'graph.custom',
      filters: { 'Custom Files': ['custom'] },
      title: 'Export Custom Graph',
      successMessage: 'Saved custom graph',
    });
  });

  it('uses filename-derived defaults when explicit options are omitted', async () => {
    vi.mocked(saveExportBuffer).mockResolvedValue(undefined);

    await savePluginExport({
      filename: 'graph.report',
      content: new Uint8Array([1, 2, 3]),
    });

    expect(saveExportBuffer).toHaveBeenCalledWith(
      expect.any(Buffer),
      {
        defaultFilename: 'graph.report',
        filters: { 'REPORT Files': ['report'] },
        title: 'Export graph.report',
        successMessage: 'Plugin export saved',
      },
    );
  });

  it('falls back to an all-files filter when the filename has no extension', async () => {
    vi.mocked(saveExportBuffer).mockResolvedValue(undefined);

    await savePluginExport({
      filename: 'graph-export',
      content: 'data',
    });

    expect(saveExportBuffer).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.objectContaining({
        filters: { 'All Files': ['*'] },
      }),
    );
  });

  it('shows an error when the shared save flow throws', async () => {
    vi.mocked(saveExportBuffer).mockRejectedValue(new Error('disk full'));

    await savePluginExport({
      filename: 'graph.json',
      content: '{}',
    });

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      'Failed to save plugin export: disk full'
    );
  });
});
