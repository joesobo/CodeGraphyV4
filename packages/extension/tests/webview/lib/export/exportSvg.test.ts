import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exportAsSvg } from '../../../../src/webview/lib/export/exportSvg';
import type { SvgExportLink, SvgExportNode, SvgExportOptions } from '../../../../src/webview/lib/export/exportSvgTypes';

const svgHarness = vi.hoisted(() => ({
  postMessage: vi.fn(),
}));

vi.mock('../../../../src/webview/lib/export/common', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../src/webview/lib/export/common')>();
  return {
    ...actual,
    createExportTimestamp: () => '2026-03-16T12-34-56',
  };
});

vi.mock('../../../../src/webview/lib/vscodeApi', () => ({
  postMessage: svgHarness.postMessage,
}));

describe('exportAsSvg', () => {
  const options: SvgExportOptions = {
    directionMode: 'arrows',
    directionColor: '#00ffcc',
    showLabels: true,
    theme: 'dark',
  };

  beforeEach(() => {
    svgHarness.postMessage.mockReset();
  });

  it('posts the generated SVG payload with a timestamped filename', () => {
    const nodes: SvgExportNode[] = [{
      id: 'app',
      label: 'app.ts',
      size: 16,
      color: '#38bdf8',
      borderColor: '#0f172a',
      borderWidth: 2,
      x: 10,
      y: 20,
    }];
    const links: SvgExportLink[] = [];

    exportAsSvg(nodes, links, options);

    expect(svgHarness.postMessage).toHaveBeenCalledOnce();
    expect(svgHarness.postMessage).toHaveBeenCalledWith({
      type: 'EXPORT_SVG',
      payload: {
        svg: expect.stringContaining('<svg xmlns="http://www.w3.org/2000/svg"'),
        filename: 'codegraphy-2026-03-16T12-34-56.svg',
      },
    });
    const payload = svgHarness.postMessage.mock.calls[0][0] as {
      payload: { svg: string };
    };
    expect(payload.payload.svg).toContain('<defs><marker id="arrowhead"');
    expect(payload.payload.svg).toContain('fill="#18181b"');
    expect(payload.payload.svg).not.toContain('<image ');
    expect(payload.payload.svg).not.toContain('Stryker was here');
  });

  it('logs and swallows failures', () => {
    const error = new Error('post failed');
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    svgHarness.postMessage.mockImplementation(() => {
      throw error;
    });

    exportAsSvg([], [], options);

    expect(consoleErrorSpy).toHaveBeenCalledWith('[CodeGraphy] SVG export failed:', error);
    consoleErrorSpy.mockRestore();
  });
});
