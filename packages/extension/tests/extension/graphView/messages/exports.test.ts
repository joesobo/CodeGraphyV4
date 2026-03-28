import { describe, expect, it, vi } from 'vitest';
import { applyExportMessage, type GraphViewExportHandlers } from '../../../../src/extension/graphView/messages/exports';

function createHandlers(
  overrides: Partial<GraphViewExportHandlers> = {},
): GraphViewExportHandlers {
  return {
    savePng: vi.fn(() => Promise.resolve()),
    saveSvg: vi.fn(() => Promise.resolve()),
    saveJpeg: vi.fn(() => Promise.resolve()),
    saveJson: vi.fn(() => Promise.resolve()),
    saveMarkdown: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

describe('graph view export message', () => {
  it('routes png export payloads to the png saver', async () => {
    const handlers = createHandlers();

    await expect(
      applyExportMessage(
        { type: 'EXPORT_PNG', payload: { dataUrl: 'data:image/png;base64,abc', filename: 'graph.png' } },
        handlers,
      ),
    ).resolves.toBe(true);

    expect(handlers.savePng).toHaveBeenCalledWith('data:image/png;base64,abc', 'graph.png');
  });

  it('routes svg export payloads to the svg saver', async () => {
    const handlers = createHandlers();

    await expect(
      applyExportMessage(
        { type: 'EXPORT_SVG', payload: { svg: '<svg />', filename: 'graph.svg' } },
        handlers,
      ),
    ).resolves.toBe(true);

    expect(handlers.saveSvg).toHaveBeenCalledWith('<svg />', 'graph.svg');
  });

  it('routes markdown export payloads to the markdown saver', async () => {
    const handlers = createHandlers();

    await expect(
      applyExportMessage(
        { type: 'EXPORT_MD', payload: { markdown: '# Graph', filename: 'graph.md' } },
        handlers,
      ),
    ).resolves.toBe(true);

    expect(handlers.saveMarkdown).toHaveBeenCalledWith('# Graph', 'graph.md');
  });

  it('routes jpeg export payloads to the jpeg saver', async () => {
    const handlers = createHandlers();

    await expect(
      applyExportMessage(
        {
          type: 'EXPORT_JPEG',
          payload: { dataUrl: 'data:image/jpeg;base64,abc', filename: 'graph.jpeg' },
        },
        handlers,
      ),
    ).resolves.toBe(true);

    expect(handlers.saveJpeg).toHaveBeenCalledWith('data:image/jpeg;base64,abc', 'graph.jpeg');
  });

  it('routes json export payloads to the json saver', async () => {
    const handlers = createHandlers();

    await expect(
      applyExportMessage(
        { type: 'EXPORT_JSON', payload: { json: '{"nodes":[]}', filename: 'graph.json' } },
        handlers,
      ),
    ).resolves.toBe(true);

    expect(handlers.saveJson).toHaveBeenCalledWith('{"nodes":[]}', 'graph.json');
  });

  it('returns false for non-export messages', async () => {
    const handlers = createHandlers();

    await expect(
      applyExportMessage({ type: 'INDEX_REPO' }, handlers),
    ).resolves.toBe(false);
  });
});
