import { describe, expect, it, vi } from 'vitest';
import { applyWebviewMessageEffects } from '../../../../src/webview/components/graph/effects/messages';
import type { GraphWebviewMessageEffect } from '../../../../src/webview/components/graph/messages/effects/routing';

function createHandlers() {
  return {
    fitView: vi.fn(),
    zoom2d: vi.fn(),
    cacheFileInfo: vi.fn(),
    updateTooltipInfo: vi.fn(),
    postMessage: vi.fn(),
    openInEditor: vi.fn(),
    exportPng: vi.fn(),
    exportSvg: vi.fn(),
    exportJpeg: vi.fn(),
    exportJson: vi.fn(),
    exportMarkdown: vi.fn(),
    updateAccessCount: vi.fn(),
  };
}

describe('graph effects messages', () => {
  it('fits the graph view', () => {
    const handlers = createHandlers();

    applyWebviewMessageEffects([{ kind: 'fitView' }], handlers);

    expect(handlers.fitView).toHaveBeenCalledOnce();
  });

  it('zooms the 2d graph', () => {
    const handlers = createHandlers();

    applyWebviewMessageEffects([{ kind: 'zoom', factor: 1.2 }], handlers);

    expect(handlers.zoom2d).toHaveBeenCalledWith(1.2);
  });

  it('caches file info', () => {
    const handlers = createHandlers();
    const info = {
      path: 'src/app.ts',
      size: 123,
      lastModified: 1704067200000,
      incomingCount: 1,
      outgoingCount: 2,
      visits: 1,
    };

    applyWebviewMessageEffects([{ kind: 'cacheFileInfo', info }], handlers);

    expect(handlers.cacheFileInfo).toHaveBeenCalledWith(info);
  });

  it('updates tooltip info', () => {
    const handlers = createHandlers();
    const info = {
      path: 'src/app.ts',
      size: 123,
      lastModified: 1704067200000,
      incomingCount: 1,
      outgoingCount: 2,
      visits: 1,
    };

    applyWebviewMessageEffects([{ kind: 'updateTooltipInfo', info }], handlers);

    expect(handlers.updateTooltipInfo).toHaveBeenCalledWith(info);
  });

  it('posts extension messages', () => {
    const handlers = createHandlers();
    const effect: GraphWebviewMessageEffect = {
      kind: 'postMessage',
      message: {
        type: 'NODE_BOUNDS_RESPONSE',
        payload: { nodes: [{ id: 'src/app.ts', x: 1, y: 2, size: 3 }] },
      },
    };

    applyWebviewMessageEffects([effect], handlers);

    expect(handlers.postMessage).toHaveBeenCalledWith(effect.message);
  });

  it('exports png', () => {
    const handlers = createHandlers();

    applyWebviewMessageEffects([{ kind: 'exportPng' }], handlers);

    expect(handlers.exportPng).toHaveBeenCalledOnce();
  });

  it('opens codegraphy in the editor', () => {
    const handlers = createHandlers();

    applyWebviewMessageEffects([{ kind: 'openInEditor' }], handlers);

    expect(handlers.openInEditor).toHaveBeenCalledOnce();
  });

  it('exports svg', () => {
    const handlers = createHandlers();

    applyWebviewMessageEffects([{ kind: 'exportSvg' }], handlers);

    expect(handlers.exportSvg).toHaveBeenCalledOnce();
  });

  it('exports jpeg', () => {
    const handlers = createHandlers();

    applyWebviewMessageEffects([{ kind: 'exportJpeg' }], handlers);

    expect(handlers.exportJpeg).toHaveBeenCalledOnce();
  });

  it('exports json', () => {
    const handlers = createHandlers();

    applyWebviewMessageEffects([{ kind: 'exportJson' }], handlers);

    expect(handlers.exportJson).toHaveBeenCalledOnce();
  });

  it('exports markdown', () => {
    const handlers = createHandlers();

    applyWebviewMessageEffects([{ kind: 'exportMarkdown' }], handlers);

    expect(handlers.exportMarkdown).toHaveBeenCalledOnce();
  });

  it('updates access counts in the graph data', () => {
    const handlers = createHandlers();

    applyWebviewMessageEffects([{ kind: 'updateAccessCount', nodeId: 'src/app.ts', accessCount: 7 }], handlers);

    expect(handlers.updateAccessCount).toHaveBeenCalledWith('src/app.ts', 7);
  });
});
