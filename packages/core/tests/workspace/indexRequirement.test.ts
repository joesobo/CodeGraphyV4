import { describe, expect, it } from 'vitest';
import { requiresSymbolAnalysisIndex } from '../../src/workspace/indexRequirement';

const symbolScope = {
  symbol: true,
  'symbol:callable': true,
  'symbol:function': true,
};

describe('workspace/indexRequirement', () => {
  it('requires Indexing only when enabled Symbol scope is not hydrated', () => {
    expect(requiresSymbolAnalysisIndex({
      files: [],
      hasGraphCache: false,
      nodeVisibility: symbolScope,
    })).toBe(true);
    expect(requiresSymbolAnalysisIndex({
      files: [],
      hasGraphCache: false,
      nodeVisibility: { file: true },
    })).toBe(false);
    expect(requiresSymbolAnalysisIndex({
      files: [{
        filePath: 'entry.ts',
        mtime: 1,
        analysis: { filePath: '/workspace/entry.ts', symbols: [] },
      }],
      hasGraphCache: true,
      nodeVisibility: symbolScope,
    })).toBe(false);
    expect(requiresSymbolAnalysisIndex({
      files: [{
        filePath: 'entry.ts',
        mtime: 1,
        analysis: { filePath: '/workspace/entry.ts' },
      }],
      hasGraphCache: true,
      nodeVisibility: symbolScope,
    })).toBe(true);
  });
});
