import { describe, expect, it } from 'vitest';
import { getGraphWebviewMessageEffects } from '../../src/webview/components/graphWebviewMessageEffects';

describe('graphWebviewMessageEffects', () => {
  it('fits the view for FIT_VIEW messages', () => {
    expect(getGraphWebviewMessageEffects({
      message: { type: 'FIT_VIEW' },
      graphMode: '3d',
      tooltipPath: null,
      graphNodes: [],
    })).toEqual([{ kind: 'fitView' }]);
  });

  it('zooms only in 2d mode for zoom messages', () => {
    expect(getGraphWebviewMessageEffects({
      message: { type: 'ZOOM_IN' },
      graphMode: '2d',
      tooltipPath: null,
      graphNodes: [],
    })).toEqual([{ kind: 'zoom', factor: 1.2 }]);

    expect(getGraphWebviewMessageEffects({
      message: { type: 'ZOOM_OUT' },
      graphMode: '2d',
      tooltipPath: null,
      graphNodes: [],
    })).toEqual([{ kind: 'zoom', factor: 1 / 1.2 }]);

    expect(getGraphWebviewMessageEffects({
      message: { type: 'ZOOM_IN' },
      graphMode: '3d',
      tooltipPath: null,
      graphNodes: [],
    })).toEqual([]);
  });

  it('caches file info and updates the tooltip when the paths match', () => {
    expect(getGraphWebviewMessageEffects({
      message: {
        type: 'FILE_INFO',
        payload: {
          path: 'src/app.ts',
          size: 123,
          lastModified: 1704067200000,
          incomingCount: 2,
          outgoingCount: 3,
          visits: 4,
        },
      },
      graphMode: '2d',
      tooltipPath: 'src/app.ts',
      graphNodes: [],
    })).toEqual([
      {
        kind: 'cacheFileInfo',
        info: {
          path: 'src/app.ts',
          size: 123,
          lastModified: 1704067200000,
          incomingCount: 2,
          outgoingCount: 3,
          visits: 4,
        },
      },
      {
        kind: 'updateTooltipInfo',
        info: {
          path: 'src/app.ts',
          size: 123,
          lastModified: 1704067200000,
          incomingCount: 2,
          outgoingCount: 3,
          visits: 4,
        },
      },
    ]);
  });

  it('returns only the cache update when file info targets a different tooltip path', () => {
    expect(getGraphWebviewMessageEffects({
      message: {
        type: 'FILE_INFO',
        payload: {
          path: 'src/app.ts',
          size: 123,
          lastModified: 1704067200000,
          incomingCount: 2,
          outgoingCount: 3,
          visits: 4,
        },
      },
      graphMode: '2d',
      tooltipPath: 'src/utils.ts',
      graphNodes: [],
    })).toEqual([
      {
        kind: 'cacheFileInfo',
        info: {
          path: 'src/app.ts',
          size: 123,
          lastModified: 1704067200000,
          incomingCount: 2,
          outgoingCount: 3,
          visits: 4,
        },
      },
    ]);
  });

  it('responds with node bounds for GET_NODE_BOUNDS messages', () => {
    expect(getGraphWebviewMessageEffects({
      message: { type: 'GET_NODE_BOUNDS' },
      graphMode: '2d',
      tooltipPath: null,
      graphNodes: [
        { id: 'src/app.ts', label: 'app.ts', size: 12, color: '#fff', borderColor: '#fff', borderWidth: 2, baseOpacity: 1, isFavorite: false, x: 10, y: 20 },
        { id: 'src/utils.ts', label: 'utils.ts', size: 8, color: '#fff', borderColor: '#fff', borderWidth: 2, baseOpacity: 1, isFavorite: false },
      ],
    })).toEqual([
      {
        kind: 'postMessage',
        message: {
          type: 'NODE_BOUNDS_RESPONSE',
          payload: {
            nodes: [
              { id: 'src/app.ts', x: 10, y: 20, size: 12 },
              { id: 'src/utils.ts', x: 0, y: 0, size: 8 },
            ],
          },
        },
      },
    ]);
  });

  it('maps export requests to export effects', () => {
    expect(getGraphWebviewMessageEffects({
      message: { type: 'REQUEST_EXPORT_PNG' },
      graphMode: '2d',
      tooltipPath: null,
      graphNodes: [],
    })).toEqual([{ kind: 'exportPng' }]);

    expect(getGraphWebviewMessageEffects({
      message: { type: 'REQUEST_EXPORT_SVG' },
      graphMode: '2d',
      tooltipPath: null,
      graphNodes: [],
    })).toEqual([{ kind: 'exportSvg' }]);

    expect(getGraphWebviewMessageEffects({
      message: { type: 'REQUEST_EXPORT_JPEG' },
      graphMode: '2d',
      tooltipPath: null,
      graphNodes: [],
    })).toEqual([{ kind: 'exportJpeg' }]);

    expect(getGraphWebviewMessageEffects({
      message: { type: 'REQUEST_EXPORT_JSON' },
      graphMode: '2d',
      tooltipPath: null,
      graphNodes: [],
    })).toEqual([{ kind: 'exportJson' }]);

    expect(getGraphWebviewMessageEffects({
      message: { type: 'REQUEST_EXPORT_MD' },
      graphMode: '2d',
      tooltipPath: null,
      graphNodes: [],
    })).toEqual([{ kind: 'exportMarkdown' }]);
  });

  it('updates cached node access counts', () => {
    expect(getGraphWebviewMessageEffects({
      message: { type: 'NODE_ACCESS_COUNT_UPDATED', payload: { nodeId: 'src/app.ts', accessCount: 7 } },
      graphMode: '2d',
      tooltipPath: null,
      graphNodes: [],
    })).toEqual([{ kind: 'updateAccessCount', nodeId: 'src/app.ts', accessCount: 7 }]);
  });

  it('ignores messages with no Graph-side effect', () => {
    expect(getGraphWebviewMessageEffects({
      message: { type: 'FAVORITES_UPDATED' },
      graphMode: '2d',
      tooltipPath: null,
      graphNodes: [],
    })).toEqual([]);
  });
});
