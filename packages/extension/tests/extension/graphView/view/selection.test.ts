import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/types';
import type { IViewContext } from '../../../../src/core/views/contracts';
import {
  getGraphViewDepthLimit,
  setGraphViewDepthLimit,
  setGraphViewFocusedFile,
} from '../../../../src/extension/graphView/view/selection';

describe('graphView/view/selection', () => {
  it('updates focused file and re-sends graph data only in depth mode', () => {
    const state = {
      _depthMode: true,
      _graphData: { nodes: [], edges: [] } satisfies IGraphData,
      _viewContext: {
        activePlugins: new Set(['plugin.alpha']),
        focusedFile: undefined,
      } satisfies IViewContext,
    };
    const applyViewTransform = vi.fn();
    const sendMessage = vi.fn();

    setGraphViewFocusedFile(state, 'src/app.ts', {
      applyViewTransform,
      sendMessage,
    });

    expect(state._viewContext.focusedFile).toBe('src/app.ts');
    expect(applyViewTransform).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'ACTIVE_FILE_UPDATED',
      payload: { filePath: 'src/app.ts' },
    });
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'GRAPH_DATA_UPDATED',
      payload: { nodes: [], edges: [] },
    });
  });

  it('clamps depth limits, persists them, and re-sends graph data only in depth mode', async () => {
    const state = {
      _depthMode: true,
      _graphData: { nodes: [], edges: [] } satisfies IGraphData,
      _viewContext: { activePlugins: new Set(), depthLimit: 1 } satisfies IViewContext,
    };
    const persistDepthLimit = vi.fn(() => Promise.resolve());
    const sendMessage = vi.fn();
    const applyViewTransform = vi.fn();

    await setGraphViewDepthLimit(state, 99, {
      persistDepthLimit,
      sendMessage,
      applyViewTransform,
    });

    expect(state._viewContext.depthLimit).toBe(10);
    expect(persistDepthLimit).toHaveBeenCalledWith(10);
    expect(sendMessage).toHaveBeenNthCalledWith(1, {
      type: 'DEPTH_LIMIT_UPDATED',
      payload: { depthLimit: 10 },
    });
    expect(applyViewTransform).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenNthCalledWith(2, {
      type: 'GRAPH_DATA_UPDATED',
      payload: { nodes: [], edges: [] },
    });
  });

  it('returns the default depth limit when the view context does not set one', () => {
    expect(getGraphViewDepthLimit({ activePlugins: new Set() }, 1)).toBe(1);
  });
});
