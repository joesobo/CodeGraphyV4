import { describe, expect, it } from 'vitest';
import { normalizeWorkspaceQueryFacts } from '../../src/workspace/queryFacts';

describe('workspace/queryFacts', () => {
  it('normalizes indexed symbol and relationship paths for repo-relative queries', () => {
    const workspaceRoot = '/workspace';

    expect(normalizeWorkspaceQueryFacts({
      symbols: [{
        id: '/workspace/src/target.ts:function:target',
        filePath: '/workspace/src/target.ts',
        kind: 'function',
        name: 'target',
      }],
      relations: [{
        kind: 'call',
        sourceId: 'core:treesitter:call',
        fromFilePath: '/workspace/src/entry.ts',
        fromNodeId: '/workspace/src/entry.ts',
        toFilePath: '/workspace/src/target.ts',
        toSymbolId: '/workspace/src/target.ts:function:target',
        resolvedPath: '/workspace/src/target.ts',
      }],
    }, workspaceRoot)).toEqual({
      symbols: [{
        id: 'src/target.ts:function:target',
        filePath: 'src/target.ts',
        kind: 'function',
        name: 'target',
      }],
      relations: [{
        kind: 'call',
        sourceId: 'core:treesitter:call',
        fromFilePath: 'src/entry.ts',
        fromNodeId: 'src/entry.ts',
        toFilePath: 'src/target.ts',
        toSymbolId: 'src/target.ts:function:target',
        resolvedPath: 'src/target.ts',
      }],
    });
  });
});
