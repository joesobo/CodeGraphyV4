import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  processEdges: vi.fn(),
  computeLinkCurvature: vi.fn(),
}));

vi.mock('../../../../../src/webview/components/graph/model/edgeProcessing', () => ({
  processEdges: mocks.processEdges,
}));

vi.mock('../../../../../src/webview/components/graph/model/link/curvature', () => ({
  computeLinkCurvature: mocks.computeLinkCurvature,
}));

import { buildGraphLinks } from '../../../../../src/webview/components/graph/model/link/build';

describe('graph/model/link/build nullish coverage', () => {
  beforeEach(() => {
    mocks.processEdges.mockReset();
    mocks.computeLinkCurvature.mockReset();
  });

  it('falls back to a one-way link when processed edges omit the bidirectional flag', () => {
    mocks.processEdges.mockReturnValue([
      { id: 'edge-1', from: 'a.ts', to: 'b.ts', kind: 'import' },
    ]);

    const links = buildGraphLinks([], 'separate');

    expect(mocks.processEdges).toHaveBeenCalledWith([], 'separate');
    expect(links).toEqual([
      {
        id: 'edge-1',
        from: 'a.ts',
        to: 'b.ts',
        source: 'a.ts',
        target: 'b.ts',
        bidirectional: false,
        baseColor: undefined,
        curvatureGroupId: 'import',
      },
    ]);
    expect(mocks.computeLinkCurvature).toHaveBeenCalledWith(links);
  });
});
