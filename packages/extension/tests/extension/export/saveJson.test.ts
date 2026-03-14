import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';

vi.mock('../../../src/extension/export/common', async () => {
  const actual = await vi.importActual<typeof import('../../../src/extension/export/common')>(
    '../../../src/extension/export/common'
  );

  return {
    ...actual,
    saveExportBuffer: vi.fn(),
  };
});

import { saveExportBuffer } from '../../../src/extension/export/common';
import { saveExportedJson } from '../../../src/extension/export/saveJson';

describe('saveJson', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (vscode.window as Record<string, unknown>).showErrorMessage = vi.fn();
  });

  it('passes the json buffer and export options to the common save flow', async () => {
    vi.mocked(saveExportBuffer).mockResolvedValue(undefined);

    await saveExportedJson('{"graph":true}', 'graph.json');

    expect(saveExportBuffer).toHaveBeenCalledTimes(1);
    const [buffer, options] = vi.mocked(saveExportBuffer).mock.calls[0];
    expect(Buffer.from(buffer).toString('utf-8')).toBe('{"graph":true}');
    expect(options).toEqual({
      defaultFilename: 'graph.json',
      filters: { 'JSON Files': ['json'] },
      title: 'Export Graph Connections as JSON',
      successMessage: 'Graph connections exported',
    });
  });

  it('encodes json content as utf-8 before delegating to the common save flow', async () => {
    vi.mocked(saveExportBuffer).mockResolvedValue(undefined);
    const bufferFromSpy = vi.spyOn(Buffer, 'from');

    await saveExportedJson('{"name":"á"}', 'graph.json');

    expect(bufferFromSpy).toHaveBeenCalledWith('{"name":"á"}', 'utf-8');
  });

  it('uses a timestamped json filename when none is provided', async () => {
    vi.mocked(saveExportBuffer).mockResolvedValue(undefined);
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000);

    await saveExportedJson('{}');

    expect(saveExportBuffer).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.objectContaining({
        defaultFilename: 'codegraphy-1700000000000.json',
      })
    );
  });

  it('shows an export error when the common save flow throws', async () => {
    vi.mocked(saveExportBuffer).mockRejectedValue(new Error('bad json'));

    await saveExportedJson('{}', 'graph.json');

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      'Failed to export JSON: bad json'
    );
  });
});
