import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';

vi.mock('../../../../src/extension/export/fileSave', async () => {
  const actual = await vi.importActual<typeof import('../../../../src/extension/export/fileSave')>(
    '../../../../src/extension/export/fileSave'
  );

  return {
    ...actual,
    saveExportBuffer: vi.fn(),
  };
});

import { saveExportBuffer } from '../../../../src/extension/export/fileSave';
import { saveExportedSymbolsJson } from '../../../../src/extension/export/symbols/save';

describe('symbol export save', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (vscode.window as Record<string, unknown>).showErrorMessage = vi.fn();
  });

  it('passes symbol json through the shared save flow as utf-8', async () => {
    vi.mocked(saveExportBuffer).mockResolvedValue(undefined);

    await saveExportedSymbolsJson('{"symbols":[]}', 'symbols.json');

    const [buffer, options] = vi.mocked(saveExportBuffer).mock.calls[0];
    expect(Buffer.from(buffer).toString('utf-8')).toBe('{"symbols":[]}');
    expect(options).toEqual({
      defaultFilename: 'symbols.json',
      filters: { 'JSON Files': ['json'] },
      title: 'Export Symbols as JSON',
      successMessage: 'Graph symbols exported',
    });
  });

  it('uses the default codegraphy filename when one is not provided', async () => {
    vi.mocked(saveExportBuffer).mockResolvedValue(undefined);

    await saveExportedSymbolsJson('{"symbols":[]}');

    expect(saveExportBuffer).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.objectContaining({
        defaultFilename: expect.stringMatching(/^codegraphy-symbols-\d+\.json$/),
      }),
    );
  });

  it('shows an error when the shared save flow throws', async () => {
    vi.mocked(saveExportBuffer).mockRejectedValue(new Error('disk full'));

    await saveExportedSymbolsJson('{"symbols":[]}');

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      'Failed to export symbols JSON: disk full'
    );
  });
});
