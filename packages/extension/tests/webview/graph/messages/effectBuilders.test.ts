import { describe, expect, it } from 'vitest';
import {
  EMPTY_EFFECTS,
  getAccessCountEffects,
  getExportEffects,
  getFileInfoEffects,
  getFitViewEffects,
  getNodeBoundsEffects,
  getZoomEffects,
} from '../../../../src/webview/components/graph/messages/effectBuilders';

describe('graph/messages/effectBuilders', () => {
  it('returns a reusable empty effects array', () => {
    expect(EMPTY_EFFECTS).toEqual([]);
  });

  it('creates fit view and export effects', () => {
    expect(getFitViewEffects()).toEqual([{ kind: 'fitView' }]);
    expect(getExportEffects('REQUEST_EXPORT_PNG')).toEqual([{ kind: 'exportPng' }]);
    expect(getExportEffects('REQUEST_EXPORT_SVG')).toEqual([{ kind: 'exportSvg' }]);
    expect(getExportEffects('REQUEST_EXPORT_JPEG')).toEqual([{ kind: 'exportJpeg' }]);
    expect(getExportEffects('REQUEST_EXPORT_JSON')).toEqual([{ kind: 'exportJson' }]);
    expect(getExportEffects('REQUEST_EXPORT_MD')).toEqual([{ kind: 'exportMarkdown' }]);
  });

  it('creates zoom effects only for 2d mode', () => {
    expect(getZoomEffects('2d', 'ZOOM_IN')).toEqual([{ kind: 'zoom', factor: 1.2 }]);
    expect(getZoomEffects('2d', 'ZOOM_OUT')).toEqual([{ kind: 'zoom', factor: 1 / 1.2 }]);
    expect(getZoomEffects('3d', 'ZOOM_IN')).toBe(EMPTY_EFFECTS);
    expect(getZoomEffects('3d', 'ZOOM_OUT')).toBe(EMPTY_EFFECTS);
  });

  it('creates file info effects for matching and non-matching tooltips', () => {
    const info = {
      path: 'src/app.ts',
      size: 123,
      lastModified: 1704067200000,
      incomingCount: 2,
      outgoingCount: 3,
      visits: 4,
    };

    expect(getFileInfoEffects('src/app.ts', info)).toEqual([
      { kind: 'cacheFileInfo', info },
      { kind: 'updateTooltipInfo', info },
    ]);
    expect(getFileInfoEffects('src/utils.ts', info)).toEqual([
      { kind: 'cacheFileInfo', info },
    ]);
  });

  it('creates node bounds effects with zero defaults for missing coordinates', () => {
    expect(getNodeBoundsEffects([
      { id: 'src/app.ts', size: 12, x: 10, y: 20 },
      { id: 'src/utils.ts', size: 8 },
    ])).toEqual([
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

  it('creates access count update effects', () => {
    expect(getAccessCountEffects({ nodeId: 'src/app.ts', accessCount: 7 })).toEqual([
      { kind: 'updateAccessCount', nodeId: 'src/app.ts', accessCount: 7 },
    ]);
  });
});
