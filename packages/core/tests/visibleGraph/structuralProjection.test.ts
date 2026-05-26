import { describe, expect, it } from 'vitest';
import type { IGraphNode } from '../../src/graph/contracts';
import {
  buildProjectedStructuralEdges,
  buildWorkspacePackageEdges,
} from '../../src/visibleGraph/structuralProjection/edges';

function node(id: string, nodeType: IGraphNode['nodeType'] = 'file'): IGraphNode {
  return {
    id,
    label: id,
    color: '#111111',
    nodeType,
  };
}

describe('visibleGraph structural projection', () => {
  it('connects file nodes to their nearest workspace package roots', () => {
    expect(buildWorkspacePackageEdges(
      new Set(['.', 'packages/core']),
      [
        node('package.json'),
        node('packages/core/src/index.ts'),
        node('docs', 'folder'),
        node('elsewhere/app.ts'),
      ],
    )).toEqual([
      {
        id: 'pkg:workspace:.->package.json#nests',
        from: 'pkg:workspace:.',
        to: 'package.json',
        kind: 'nests',
        sources: [],
      },
      {
        id: 'pkg:workspace:packages/core->packages/core/src/index.ts#nests',
        from: 'pkg:workspace:packages/core',
        to: 'packages/core/src/index.ts',
        kind: 'nests',
        sources: [],
      },
      {
        id: 'pkg:workspace:.->elsewhere/app.ts#nests',
        from: 'pkg:workspace:.',
        to: 'elsewhere/app.ts',
        kind: 'nests',
        sources: [],
      },
    ]);
  });

  it('returns no structural edges when nesting projection is disabled', () => {
    expect(buildProjectedStructuralEdges(
      { nestsEnabled: false, folderEnabled: true, packageEnabled: true },
      new Set(['src']),
      new Set(['.']),
      [node('src/app.ts')],
    )).toEqual([]);
  });
});
