import { describe, expect, it } from 'vitest';
import { getGraphWebviewMessageEffects } from '../../../../src/webview/components/graph/messages/effects/routing';

describe('graph/messages/effects/routing', () => {
  it('fits the view for FIT_VIEW messages', () => {
    expect(getGraphWebviewMessageEffects({
      message: { type: 'FIT_VIEW' },
      tooltipPath: null,
      graphNodes: [],
    })).toEqual([{ kind: 'fitView' }]);
  });

  it('zooms in any graph mode for zoom messages', () => {
    expect(getGraphWebviewMessageEffects({
      message: { type: 'ZOOM_IN' },
      tooltipPath: null,
      graphNodes: [],
    })).toEqual([{ kind: 'zoom', factor: 1.2 }]);

    expect(getGraphWebviewMessageEffects({
      message: { type: 'ZOOM_OUT' },
      tooltipPath: null,
      graphNodes: [],
    })).toEqual([{ kind: 'zoom', factor: 1 / 1.2 }]);

    expect(getGraphWebviewMessageEffects({
      message: { type: 'ZOOM_IN' },
      tooltipPath: null,
      graphNodes: [],
    })).toEqual([{ kind: 'zoom', factor: 1.2 }]);

    expect(getGraphWebviewMessageEffects({
      message: { type: 'ZOOM_OUT' },
      tooltipPath: null,
      graphNodes: [],
    })).toEqual([{ kind: 'zoom', factor: 1 / 1.2 }]);
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
        },
      },
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
        },
      },
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
        },
      },
    ]);
  });

  it('responds with node bounds for GET_NODE_BOUNDS messages', () => {
    expect(getGraphWebviewMessageEffects({
      message: { type: 'GET_NODE_BOUNDS' },
      tooltipPath: null,
      graphNodes: [
        { id: 'src/app.ts', size: 12, x: 10, y: 20 },
        { id: 'src/utils.ts', size: 8 },
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

  it('responds with the graph runtime state for GET_GRAPH_RUNTIME_STATE messages', () => {
    expect(getGraphWebviewMessageEffects({
      message: { type: 'GET_GRAPH_RUNTIME_STATE' },
      tooltipPath: null,
      graphLinks: [
        { id: 'src/app.ts->src/utils.ts#import', source: 'src/app.ts', target: 'src/utils.ts' },
      ] as never,
      graphNodes: [
        { id: 'src/app.ts', size: 12, x: 10, y: 20 },
        { id: 'src/utils.ts', size: 8 },
      ],
    })).toEqual([
      {
        kind: 'postMessage',
        message: {
          type: 'GRAPH_RUNTIME_STATE_RESPONSE',
          payload: {
            edgeCount: 1,
            edgeIds: ['src/app.ts->src/utils.ts#import'],
            nodeCount: 2,
          },
        },
      },
    ]);
  });

  it('maps export requests to export effects', () => {
    expect(getGraphWebviewMessageEffects({
      message: { type: 'REQUEST_EXPORT_PNG' },
      tooltipPath: null,
      graphNodes: [],
    })).toEqual([{ kind: 'exportPng' }]);

    expect(getGraphWebviewMessageEffects({
      message: { type: 'REQUEST_EXPORT_SVG' },
      tooltipPath: null,
      graphNodes: [],
    })).toEqual([{ kind: 'exportSvg' }]);

    expect(getGraphWebviewMessageEffects({
      message: { type: 'REQUEST_EXPORT_JPEG' },
      tooltipPath: null,
      graphNodes: [],
    })).toEqual([{ kind: 'exportJpeg' }]);

    expect(getGraphWebviewMessageEffects({
      message: { type: 'REQUEST_EXPORT_JSON' },
      tooltipPath: null,
      graphNodes: [],
    })).toEqual([{ kind: 'exportJson' }]);

    expect(getGraphWebviewMessageEffects({
      message: { type: 'REQUEST_EXPORT_MD' },
      tooltipPath: null,
      graphNodes: [],
    })).toEqual([{ kind: 'exportMarkdown' }]);

    expect(getGraphWebviewMessageEffects({
      message: { type: 'REQUEST_OPEN_IN_EDITOR' },
      tooltipPath: null,
      graphNodes: [],
    })).toEqual([{ kind: 'openInEditor' }]);
  });

  it('ignores messages with no Graph-side effect', () => {
    expect(getGraphWebviewMessageEffects({
      message: { type: 'FAVORITES_UPDATED', payload: { favorites: [] } },
      tooltipPath: null,
      graphNodes: [],
    })).toEqual([]);

    expect(getGraphWebviewMessageEffects({
      message: { type: 'GRAPH_DATA_UPDATED', payload: { nodes: [], edges: [] } },
      tooltipPath: null,
      graphNodes: [],
    })).toEqual([]);
  });
});
