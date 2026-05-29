import { describe, expect, it } from 'vitest';
import type { IGraphEdge } from '../../../../../src/shared/graph/contracts';
import { mergeGitHistoryEdgeSources } from '../../../../../src/extension/gitHistory/diff/state/sources';

function edgeWithSources(sources: IGraphEdge['sources']): IGraphEdge {
  return {
    id: 'src/a.ts->src/b.ts#import',
    from: 'src/a.ts',
    to: 'src/b.ts',
    kind: 'import',
    sources,
  };
}

describe('gitHistory/diff/state/sources', () => {
  it('merges new edge sources without duplicating existing source ids', () => {
    const targetEdge = edgeWithSources([
      { id: 'existing', pluginId: 'plugin', sourceId: 'existing', label: 'Existing' },
    ]);
    const sourceEdge = edgeWithSources([
      { id: 'existing', pluginId: 'plugin', sourceId: 'existing', label: 'Existing duplicate' },
      { id: 'added', pluginId: 'plugin', sourceId: 'added', label: 'Added' },
    ]);

    mergeGitHistoryEdgeSources(targetEdge, sourceEdge);

    expect(targetEdge.sources).toEqual([
      { id: 'existing', pluginId: 'plugin', sourceId: 'existing', label: 'Existing' },
      { id: 'added', pluginId: 'plugin', sourceId: 'added', label: 'Added' },
    ]);
  });
});
