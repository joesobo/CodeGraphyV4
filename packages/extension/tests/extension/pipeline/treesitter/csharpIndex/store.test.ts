import { afterEach, describe, expect, it } from 'vitest';
import {
  clearCSharpWorkspaceIndex,
  createEmptyCSharpIndex,
  getCSharpWorkspaceIndex,
  setCSharpWorkspaceIndex,
} from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/csharpIndex/store';

const workspaceRoots = ['/workspace/store-a', '/workspace/store-b'];

afterEach(() => {
  for (const workspaceRoot of workspaceRoots) {
    clearCSharpWorkspaceIndex(workspaceRoot);
  }
});

describe('pipeline/plugins/treesitter/runtime/csharpIndex/store', () => {
  it('creates an empty index with a qualified-name map', () => {
    const index = createEmptyCSharpIndex();

    expect(index).toEqual({
      typesByQualifiedName: expect.any(Map),
    });
    expect(index.typesByQualifiedName.size).toBe(0);
  });

  it('stores, reads, and clears indexes per workspace root', () => {
    const firstIndex = createEmptyCSharpIndex();
    const secondIndex = createEmptyCSharpIndex();

    setCSharpWorkspaceIndex(workspaceRoots[0], firstIndex);
    setCSharpWorkspaceIndex(workspaceRoots[1], secondIndex);

    expect(getCSharpWorkspaceIndex(workspaceRoots[0])).toBe(firstIndex);
    expect(getCSharpWorkspaceIndex(workspaceRoots[1])).toBe(secondIndex);

    clearCSharpWorkspaceIndex(workspaceRoots[0]);

    expect(getCSharpWorkspaceIndex(workspaceRoots[0])).toBeUndefined();
    expect(getCSharpWorkspaceIndex(workspaceRoots[1])).toBe(secondIndex);
  });
});
