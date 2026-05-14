import { describe, expect, it } from 'vitest';
import type { IAnalysisSymbol } from '@codegraphy/plugin-api';
import { createSymbolMetadata } from '../../../src/graphQuery/relationships/symbolMetadata';

describe('core/graphQuery/relationships/symbolMetadata', () => {
  it('keeps display metadata and ignores non-string plugin metadata values', () => {
    const symbol: IAnalysisSymbol = {
      id: 'src/a.ts#User:type',
      filePath: 'src/a.ts',
      name: 'User',
      kind: 'type',
      signature: 'type User = { id: string }',
      range: { startLine: 1, endLine: 3 },
      metadata: {
        language: 'typescript',
        source: 'codegraphy.treesitter',
        pluginKind: 'type-alias',
        ignored: 42,
      },
    };

    expect(createSymbolMetadata(symbol)).toEqual({
      signature: 'type User = { id: string }',
      range: { startLine: 1, endLine: 3 },
      language: 'typescript',
      source: 'codegraphy.treesitter',
      pluginKind: 'type-alias',
    });
    expect(createSymbolMetadata({
      id: 'src/a.ts#empty',
      filePath: 'src/a.ts',
      name: 'empty',
      kind: '',
    })).toEqual({});
  });
});
