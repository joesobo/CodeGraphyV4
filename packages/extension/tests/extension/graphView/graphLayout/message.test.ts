import { describe, expect, it, vi } from 'vitest';
import { createGraphLayoutUpdatedMessage } from '../../../../src/extension/graphView/graphLayout/message';
import { getCodeGraphyConfiguration } from '../../../../src/extension/repoSettings/current';

vi.mock('../../../../src/extension/repoSettings/current', () => ({
  getCodeGraphyConfiguration: vi.fn(),
}));

describe('createGraphLayoutUpdatedMessage', () => {
  it('reads the current CodeGraphy graph layout and normalizes it for the webview', () => {
    const graphLayout = {
      pinnedNodes: {
        'src/app.ts': {
          nodeId: 'src/app.ts',
          twoDimensional: { x: 10, y: 20 },
          updatedAt: '2026-05-07T23:00:00.000Z',
        },
      },
      sections: { ignored: true },
      ownership: { ignored: true },
    };
    const configuration = {
      get: vi.fn((_key: string, _fallback: unknown) => graphLayout),
    };
    vi.mocked(getCodeGraphyConfiguration).mockReturnValue(configuration as never);

    expect(createGraphLayoutUpdatedMessage()).toEqual({
      type: 'GRAPH_LAYOUT_UPDATED',
      payload: {
        pinnedNodes: graphLayout.pinnedNodes,
      },
    });
    expect(configuration.get).toHaveBeenCalledWith('graphLayout', {
      pinnedNodes: {},
    });
  });
});
