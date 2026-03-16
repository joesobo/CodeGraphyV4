import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../src/webview/lib/vscodeApi', () => ({
  postMessage: vi.fn(),
}));

vi.mock('../../../../src/webview/lib/export/common', () => ({
  createExportTimestamp: vi.fn(),
  createImageExportDataUrl: vi.fn(),
}));

import { exportAsPng } from '../../../../src/webview/lib/export/exportPng';
import { postMessage } from '../../../../src/webview/lib/vscodeApi';
import {
  createExportTimestamp,
  createImageExportDataUrl,
} from '../../../../src/webview/lib/export/common';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('exportAsPng', () => {
  it('posts an export message with a timestamped png filename', () => {
    const container = document.createElement('div') as HTMLDivElement;
    vi.mocked(createImageExportDataUrl).mockReturnValue('data:image/png;base64,abc');
    vi.mocked(createExportTimestamp).mockReturnValue('2026-03-16T12-34-56');

    exportAsPng(container);

    expect(createImageExportDataUrl).toHaveBeenCalledWith(container, {
      mimeType: 'image/png',
    });
    expect(postMessage).toHaveBeenCalledWith({
      type: 'EXPORT_PNG',
      payload: {
        dataUrl: 'data:image/png;base64,abc',
        filename: 'codegraphy-2026-03-16T12-34-56.png',
      },
    });
  });

  it('logs a missing canvas error and skips posting when export data is unavailable', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(createImageExportDataUrl).mockReturnValue(null);

    exportAsPng(document.createElement('div') as HTMLDivElement);

    expect(createExportTimestamp).not.toHaveBeenCalled();
    expect(postMessage).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith('[CodeGraphy] No canvas found');
  });

  it('logs export failures instead of throwing', () => {
    const error = new Error('png failed');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(createImageExportDataUrl).mockImplementation(() => {
      throw error;
    });

    exportAsPng(document.createElement('div') as HTMLDivElement);

    expect(postMessage).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith('[CodeGraphy] Export failed:', error);
  });
});
