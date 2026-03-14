import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';

vi.mock('../../../src/extension/export/common', async () => {
  const actual = await vi.importActual<typeof import('../../../src/extension/export/common')>(
    '../../../src/extension/export/common'
  );

  return {
    ...actual,
    decodeBase64DataUrl: vi.fn(),
    saveExportBuffer: vi.fn(),
  };
});

import { decodeBase64DataUrl, saveExportBuffer } from '../../../src/extension/export/common';
import { saveExportedJpeg } from '../../../src/extension/export/saveJpeg';

describe('saveJpeg', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (vscode.window as Record<string, unknown>).showErrorMessage = vi.fn();
  });

  it('decodes jpeg export data and forwards the save options', async () => {
    const decodedBuffer = Buffer.from('jpeg-data');
    vi.mocked(decodeBase64DataUrl).mockReturnValue(decodedBuffer);
    vi.mocked(saveExportBuffer).mockResolvedValue(undefined);

    await saveExportedJpeg('data:image/jpeg;base64,BBBB', 'graph.jpg');

    expect(decodeBase64DataUrl).toHaveBeenCalledWith(
      'data:image/jpeg;base64,BBBB',
      'data:image/jpeg;base64,'
    );
    expect(saveExportBuffer).toHaveBeenCalledWith(decodedBuffer, {
      defaultFilename: 'graph.jpg',
      filters: { 'JPEG Images': ['jpg', 'jpeg'] },
      title: 'Export Graph as JPEG',
      successMessage: 'Graph exported',
    });
  });

  it('uses a timestamped jpeg filename when none is provided', async () => {
    vi.mocked(decodeBase64DataUrl).mockReturnValue(Buffer.from('jpeg-data'));
    vi.mocked(saveExportBuffer).mockResolvedValue(undefined);
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000);

    await saveExportedJpeg('data:image/jpeg;base64,BBBB');

    expect(saveExportBuffer).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.objectContaining({
        defaultFilename: 'codegraphy-1700000000000.jpg',
      })
    );
  });

  it('shows an export error when jpeg export fails', async () => {
    vi.mocked(decodeBase64DataUrl).mockImplementation(() => {
      throw new Error('bad jpeg');
    });

    await saveExportedJpeg('data:image/jpeg;base64,BBBB', 'graph.jpg');

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      'Failed to export JPEG: bad jpeg'
    );
  });
});
