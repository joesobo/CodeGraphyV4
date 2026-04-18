import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../src/shared/graph/contracts';
import {
  getGraphViewVisitCount,
  incrementGraphViewVisitCount,
  trackGraphViewFileVisit,
} from '../../../../../src/extension/graphView/files/visits/tracking';

describe('graphView/files/visits/tracking', () => {
  it('reads visit counts from persisted state', () => {
    const workspaceState = {
      get: vi.fn(() => ({ 'src/app.ts': 4 })),
    };

    expect(getGraphViewVisitCount(workspaceState as never, 'src/app.ts')).toBe(4);
  });

  it('increments visit counts and forwards the update message', async () => {
    const sendMessage = vi.fn();

    await incrementGraphViewVisitCount('src/app.ts', {
      workspaceState: {
        get: vi.fn(() => ({ 'src/app.ts': 2 })),
        update: vi.fn(() => Promise.resolve()),
      } as never,
      sendMessage,
    });

    expect(sendMessage).toHaveBeenCalledWith({
      type: 'NODE_ACCESS_COUNT_UPDATED',
      payload: { nodeId: 'src/app.ts', accessCount: 3 },
    });
  });

  it('tracks only files that exist in the current graph', async () => {
    const incrementVisitCount = vi.fn(() => Promise.resolve());

    await trackGraphViewFileVisit('src/app.ts', {
      graphData: { nodes: [{ id: 'src/app.ts', label: 'app.ts', color: '#fff' }], edges: [] } satisfies IGraphData,
      incrementVisitCount,
    });
    await trackGraphViewFileVisit('src/other.ts', {
      graphData: { nodes: [{ id: 'src/app.ts', label: 'app.ts', color: '#fff' }], edges: [] } satisfies IGraphData,
      incrementVisitCount,
    });

    expect(incrementVisitCount).toHaveBeenCalledTimes(1);
    expect(incrementVisitCount).toHaveBeenCalledWith('src/app.ts');
  });
});
