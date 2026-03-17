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
import { saveExportedMarkdown } from '../../../src/extension/export/saveMarkdown';

describe('markdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (vscode.window as Record<string, unknown>).showErrorMessage = vi.fn();
  });

  it('passes the markdown buffer and export options to the common save flow', async () => {
    vi.mocked(saveExportBuffer).mockResolvedValue(undefined);

    await saveExportedMarkdown('# Graph', 'graph.md');

    expect(saveExportBuffer).toHaveBeenCalledTimes(1);
    const [buffer, options] = vi.mocked(saveExportBuffer).mock.calls[0];
    expect(Buffer.from(buffer).toString('utf-8')).toBe('# Graph');
    expect(options).toEqual({
      defaultFilename: 'graph.md',
      filters: { 'Markdown Files': ['md'] },
      title: 'Export Graph as Markdown',
      successMessage: 'Graph exported',
    });
  });

  it('encodes markdown content as utf-8 before delegating to the common save flow', async () => {
    vi.mocked(saveExportBuffer).mockResolvedValue(undefined);
    const bufferFromSpy = vi.spyOn(Buffer, 'from');

    await saveExportedMarkdown('# á', 'graph.md');

    expect(bufferFromSpy).toHaveBeenCalledWith('# á', 'utf-8');
  });

  it('uses a timestamped markdown filename when none is provided', async () => {
    vi.mocked(saveExportBuffer).mockResolvedValue(undefined);
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000);

    await saveExportedMarkdown('# Graph');

    expect(saveExportBuffer).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.objectContaining({
        defaultFilename: 'codegraphy-1700000000000.md',
      })
    );
  });

  it('shows an export error when the common save flow throws', async () => {
    vi.mocked(saveExportBuffer).mockRejectedValue(new Error('bad markdown'));

    await saveExportedMarkdown('# Graph', 'graph.md');

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      'Failed to export Markdown: bad markdown'
    );
  });
});
