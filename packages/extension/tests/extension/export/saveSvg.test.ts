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

import { saveExportedSvg } from '../../../src/extension/export/saveSvg';
import { saveExportBuffer } from '../../../src/extension/export/fileSave';

describe('svg', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (vscode.window as Record<string, unknown>).showErrorMessage = vi.fn();
  });

  it('passes the svg buffer and export options to the common save flow', async () => {
    vi.mocked(saveExportBuffer).mockResolvedValue(undefined);

    await saveExportedSvg('<svg><rect /></svg>', 'graph.svg');

    expect(saveExportBuffer).toHaveBeenCalledTimes(1);
    const [buffer, options] = vi.mocked(saveExportBuffer).mock.calls[0];
    expect(Buffer.from(buffer).toString('utf-8')).toBe('<svg><rect /></svg>');
    expect(options).toEqual({
      defaultFilename: 'graph.svg',
      filters: { 'SVG Images': ['svg'] },
      title: 'Export Graph as SVG',
      successMessage: 'Graph exported',
    });
  });

  it('encodes svg content as utf-8 before delegating to the common save flow', async () => {
    vi.mocked(saveExportBuffer).mockResolvedValue(undefined);
    const bufferFromSpy = vi.spyOn(Buffer, 'from');

    await saveExportedSvg('<svg>á</svg>', 'graph.svg');

    expect(bufferFromSpy).toHaveBeenCalledWith('<svg>á</svg>', 'utf-8');
  });

  it('uses a timestamped svg filename when none is provided', async () => {
    vi.mocked(saveExportBuffer).mockResolvedValue(undefined);
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000);

    await saveExportedSvg('<svg />');

    expect(saveExportBuffer).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.objectContaining({
        defaultFilename: 'codegraphy-1700000000000.svg',
      })
    );
  });

  it('shows an export error when the common save flow throws', async () => {
    vi.mocked(saveExportBuffer).mockRejectedValue(new Error('disk full'));

    await saveExportedSvg('<svg />', 'graph.svg');

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Failed to export SVG: disk full');
  });
});
