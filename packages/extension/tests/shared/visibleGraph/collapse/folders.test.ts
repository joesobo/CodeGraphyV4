import { describe, expect, it } from 'vitest';
import type { IGraphNode } from '../../../../src/shared/graph/contracts';
import {
  collectCollapsedFolderIds,
  collectFolderIds,
} from '../../../../src/shared/visibleGraph/collapse/folders';

function node(id: string, nodeType?: string): IGraphNode {
  return {
    id,
    label: id,
    color: '#111111',
    nodeType,
  };
}

describe('shared/visibleGraph/collapse/folders', () => {
  it('collects only folder node ids', () => {
    expect(collectFolderIds([
      node('src', 'folder'),
      node('src/app.ts'),
      node('pkg', 'package'),
    ])).toEqual(new Set(['src']));
  });

  it('keeps collapsed ids only when they are folders', () => {
    expect(collectCollapsedFolderIds({
      collapsedNodeIds: ['src', 'missing', 'src/app.ts'],
    }, new Set(['src']))).toEqual(new Set(['src']));
  });

  it('returns an empty set when collapse config is missing', () => {
    expect(collectCollapsedFolderIds(undefined, new Set(['src', 'Stryker was here']))).toEqual(new Set());
  });
});
