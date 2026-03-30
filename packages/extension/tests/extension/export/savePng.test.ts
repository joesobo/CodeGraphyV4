import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';

vi.mock('../../../src/extension/export/fileSave', async () => {
  const actual = await vi.importActual<typeof import('../../../src/extension/export/fileSave')>(
    '../../../src/extension/export/fileSave'
  );

  return {
    ...actual,
    decodeBase64DataUrl: vi.fn(),
    saveExportBuffer: vi.fn(),
  };
});

import { decodeBase64DataUrl, saveExportBuffer } from '../../../src/extension/export/fileSave';
import { saveExportedPng } from '../../../src/extension/export/savePng';

describe('png', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (vscode.window as Record<string, unknown>).showErrorMessage = vi.fn();
  });

  it('decodes png export data and forwards the save options', async () => {
    const decodedBuffer = Buffer.from('png-data');
    vi.mocked(decodeBase64DataUrl).mockReturnValue(decodedBuffer);
    vi.mocked(saveExportBuffer).mockResolvedValue(undefined);

    await saveExportedPng('data:image/png;base64,AAAA', 'graph.png');

    expect(decodeBase64DataUrl).toHaveBeenCalledWith(
      'data:image/png;base64,AAAA',
      'data:image/png;base64,'
    );
    expect(saveExportBuffer).toHaveBeenCalledWith(decodedBuffer, {
      defaultFilename: 'graph.png',
      filters: { 'PNG Images': ['png'] },
      title: 'Export Graph as PNG',
      successMessage: 'Graph exported',
    });
  });

  it('uses a timestamped png filename when none is provided', async () => {
    vi.mocked(decodeBase64DataUrl).mockReturnValue(Buffer.from('png-data'));
    vi.mocked(saveExportBuffer).mockResolvedValue(undefined);
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000);

    await saveExportedPng('data:image/png;base64,AAAA');

    expect(saveExportBuffer).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.objectContaining({
        defaultFilename: 'codegraphy-1700000000000.png',
      })
    );
  });

  it('shows an export error when png export fails', async () => {
    vi.mocked(decodeBase64DataUrl).mockImplementation(() => {
      throw new Error('bad png');
    });

    await saveExportedPng('data:image/png;base64,AAAA', 'graph.png');

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Failed to export PNG: bad png');
  });
});
