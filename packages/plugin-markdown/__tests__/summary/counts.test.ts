import { describe, expect, it } from 'vitest';
import type { IGraphEdge } from '@codegraphy-vscode/plugin-api';
import { buildWikilinkCounts } from '../../src/summary/counts';

describe('buildWikilinkCounts', () => {
  it('counts both ends of every wikilink edge', () => {
    const referenceEdges: IGraphEdge[] = [
      { id: 'a', from: 'Home.md', to: 'Guide.md', kind: 'reference', sources: [] },
      { id: 'b', from: 'Guide.md', to: 'Tips.md', kind: 'reference', sources: [] },
    ];

    const { linkedNodeIds, linkCounts } = buildWikilinkCounts(referenceEdges);

    expect([...linkedNodeIds]).toEqual(['Home.md', 'Guide.md', 'Tips.md']);
    expect(linkCounts.get('Home.md')).toBe(1);
    expect(linkCounts.get('Guide.md')).toBe(2);
    expect(linkCounts.get('Tips.md')).toBe(1);
  });
});

