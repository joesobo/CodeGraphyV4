import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../src/webview/lib/vscodeApi', () => ({
  postMessage: vi.fn(),
}));

vi.mock('../../../../src/webview/lib/export/common', () => ({
  createExportTimestamp: vi.fn(),
  createImageExportDataUrl: vi.fn(),
}));

import { exportAsJpeg } from '../../../../src/webview/lib/export/exportJpeg';
import { postMessage } from '../../../../src/webview/lib/vscodeApi';
import {
  createExportTimestamp,
  createImageExportDataUrl,
} from '../../../../src/webview/lib/export/common';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('exportAsJpeg', () => {
  it('posts an export message with a timestamped jpeg filename', () => {
    const container = document.createElement('div') as HTMLDivElement;
    vi.mocked(createImageExportDataUrl).mockReturnValue('data:image/jpeg;base64,abc');
    vi.mocked(createExportTimestamp).mockReturnValue('2026-03-16T12-34-56');

    exportAsJpeg(container);

    expect(createImageExportDataUrl).toHaveBeenCalledWith(container, {
      mimeType: 'image/jpeg',
      quality: 0.92,
    });
    expect(postMessage).toHaveBeenCalledWith({
      type: 'EXPORT_JPEG',
      payload: {
        dataUrl: 'data:image/jpeg;base64,abc',
        filename: 'codegraphy-2026-03-16T12-34-56.jpg',
      },
    });
  });

  it('logs a missing canvas error and skips posting when export data is unavailable', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(createImageExportDataUrl).mockReturnValue(null);

    exportAsJpeg(document.createElement('div') as HTMLDivElement);

    expect(createExportTimestamp).not.toHaveBeenCalled();
    expect(postMessage).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith('[CodeGraphy] No canvas found');
  });

  it('logs export failures instead of throwing', () => {
    const error = new Error('jpeg failed');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(createImageExportDataUrl).mockImplementation(() => {
      throw error;
    });

    exportAsJpeg(document.createElement('div') as HTMLDivElement);

    expect(postMessage).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith('[CodeGraphy] JPEG export failed:', error);
  });
});
