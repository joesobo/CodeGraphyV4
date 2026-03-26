import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createExportTimestamp,
  createImageExportDataUrl,
  getExportContext,
  resolveDirectionColor,
} from '../../../src/webview/export/exportContext';
import { graphStore } from '../../../src/webview/store';
import { DEFAULT_DIRECTION_COLOR } from '../../../src/shared/contracts';

const initialExportContext = {
  timelineActive: graphStore.getState().timelineActive,
  currentCommitSha: graphStore.getState().currentCommitSha,
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  graphStore.setState(initialExportContext);
});

describe('createExportTimestamp', () => {
  it('returns an ISO timestamp safe for filenames', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-16T12:34:56.789Z'));

    expect(createExportTimestamp()).toBe('2026-03-16T12-34-56');
  });
});

describe('getExportContext', () => {
  it('returns the current timeline state from the graph store', () => {
    graphStore.setState({ timelineActive: true, currentCommitSha: 'abc123' });

    expect(getExportContext()).toEqual({
      timelineActive: true,
      currentCommitSha: 'abc123',
    });
  });
});

describe('resolveDirectionColor', () => {
  it('keeps valid six-digit hex colors', () => {
    expect(resolveDirectionColor('#AbC123')).toBe('#AbC123');
  });

  it.each([
    'rgb(1, 2, 3)',
    '#12345',
    '#1234567',
    '123456',
    '#GGGGGG',
  ])('falls back to the default direction color for invalid input: %s', (value) => {
    expect(resolveDirectionColor(value)).toBe(DEFAULT_DIRECTION_COLOR);
  });
});

describe('createImageExportDataUrl', () => {
  it('returns null when the container does not include a canvas', () => {
    const container = document.createElement('div') as HTMLDivElement;

    expect(createImageExportDataUrl(container, { mimeType: 'image/png' })).toBeNull();
  });

  it('returns null when the export canvas cannot provide a 2d context', () => {
    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = 320;
    sourceCanvas.height = 180;

    const container = document.createElement('div') as HTMLDivElement;
    container.append(sourceCanvas);

    const originalCreateElement = document.createElement.bind(document);
    const exportCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => null),
    } as unknown as HTMLCanvasElement;

    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
      if (tagName === 'canvas') {
        return exportCanvas;
      }

      return originalCreateElement(tagName, options);
    }) as typeof document.createElement);

    expect(createImageExportDataUrl(container, { mimeType: 'image/png' })).toBeNull();
    expect(exportCanvas.width).toBe(320);
    expect(exportCanvas.height).toBe(180);
  });

  it('draws the source canvas onto an export canvas with the export background color', () => {
    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = 640;
    sourceCanvas.height = 360;

    const container = document.createElement('div') as HTMLDivElement;
    container.append(sourceCanvas);

    const fillRect = vi.fn();
    const drawImage = vi.fn();
    const context = {
      fillStyle: '',
      fillRect,
      drawImage,
    } as unknown as CanvasRenderingContext2D;
    const toDataURL = vi.fn(() => 'data:image/png;base64,exported');
    const exportCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => context),
      toDataURL,
    } as unknown as HTMLCanvasElement;
    const originalCreateElement = document.createElement.bind(document);

    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
      if (tagName === 'canvas') {
        return exportCanvas;
      }

      return originalCreateElement(tagName, options);
    }) as typeof document.createElement);

    const result = createImageExportDataUrl(container, { mimeType: 'image/png' });

    expect(result).toBe('data:image/png;base64,exported');
    expect(exportCanvas.width).toBe(640);
    expect(exportCanvas.height).toBe(360);
    expect(exportCanvas.getContext).toHaveBeenCalledWith('2d');
    expect(context.fillStyle).toBe('#18181b');
    expect(fillRect).toHaveBeenCalledWith(0, 0, 640, 360);
    expect(drawImage).toHaveBeenCalledWith(sourceCanvas, 0, 0);
    expect(toDataURL).toHaveBeenCalledWith('image/png');
  });

  it('passes through the requested quality when exporting a jpeg', () => {
    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = 800;
    sourceCanvas.height = 600;

    const container = document.createElement('div') as HTMLDivElement;
    container.append(sourceCanvas);

    const exportCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({
        fillStyle: '',
        fillRect: vi.fn(),
        drawImage: vi.fn(),
      })),
      toDataURL: vi.fn(() => 'data:image/jpeg;base64,exported'),
    } as unknown as HTMLCanvasElement;
    const originalCreateElement = document.createElement.bind(document);

    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
      if (tagName === 'canvas') {
        return exportCanvas;
      }

      return originalCreateElement(tagName, options);
    }) as typeof document.createElement);

    const result = createImageExportDataUrl(container, {
      mimeType: 'image/jpeg',
      quality: 0.92,
    });

    expect(result).toBe('data:image/jpeg;base64,exported');
    expect(exportCanvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.92);
  });
});
