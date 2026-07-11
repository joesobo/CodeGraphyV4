import { applyGraphDataPatchInPlace, diffGraphData } from '@codegraphy-dev/core';
import { describe, expect, it } from 'vitest';
import { chunkGraphDataPatch } from '../../../../../../src/extension/graphView/provider/refresh/scoped/chunks';
import type { IGraphData } from '../../../../../../src/shared/graph/contracts';

describe('graphView/provider/refresh/scoped/chunks', () => {
  it('bounds every hydration patch and preserves remove-before-add ordering', () => {
    const previous = {
      nodes: [
        { id: 'old.ts', label: 'old.ts', color: '#fff' },
        { id: 'changed.ts', label: 'before', color: '#fff' },
      ],
      edges: [{ id: 'old.ts->changed.ts#import', from: 'old.ts', to: 'changed.ts', kind: 'import', sources: [] }],
    } satisfies IGraphData;
    const next = {
      nodes: [
        { id: 'changed.ts', label: 'after', color: '#fff' },
        { id: 'new-a.ts', label: 'new-a.ts', color: '#fff' },
        { id: 'new-b.ts', label: 'new-b.ts', color: '#fff' },
      ],
      edges: [
        { id: 'changed.ts->new-a.ts#import', from: 'changed.ts', to: 'new-a.ts', kind: 'import', sources: [] },
        { id: 'new-a.ts->new-b.ts#import', from: 'new-a.ts', to: 'new-b.ts', kind: 'import', sources: [] },
      ],
    } satisfies IGraphData;

    const chunks = chunkGraphDataPatch(diffGraphData(previous, next), 1);
    const hydrated = structuredClone(previous);
    for (const chunk of chunks) {
      const itemCount = chunk.addedNodes.length
        + chunk.updatedNodes.length
        + chunk.removedNodeIds.length
        + chunk.addedLinks.length
        + chunk.removedLinkIds.length;
      expect(itemCount).toBeLessThanOrEqual(1);
      applyGraphDataPatchInPlace(hydrated, chunk);
    }

    expect(hydrated).toEqual(next);
  });
});
