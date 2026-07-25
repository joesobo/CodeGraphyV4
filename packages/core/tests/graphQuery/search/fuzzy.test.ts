import { describe, expect, it } from 'vitest';
import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import { findFuzzySymbols } from '../../../src/graphQuery/search/fuzzy';

const symbols: IAnalysisSymbol[] = [
  { id: 'scheduler', filePath: 'scheduler.ts', name: 'createPluginGraphWorkScheduler', kind: 'function' },
  { id: 'inject', filePath: 'injection.ts', name: 'injectPluginAssets', kind: 'function' },
  { id: 'unrelated', filePath: 'unrelated.ts', name: 'readWorkspaceSettings', kind: 'function' },
];

describe('core/graphQuery fuzzy Symbol search', () => {
  it('ranks small identifier typos and shared camel-case concepts without broad short guesses', () => {
    expect(findFuzzySymbols('createPluginGraphWorkSchedulr', symbols).map(symbol => symbol.id))
      .toEqual(['scheduler']);
    expect(findFuzzySymbols('loadPluginAssets', symbols).map(symbol => symbol.id))
      .toEqual(['inject']);
    expect(findFuzzySymbols('indx', symbols)).toEqual([]);
  });
});
