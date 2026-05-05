import { describe, expect, it } from 'vitest';
import type {
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '../../../../src/core/plugins/types/contracts';
import { createSymbolsByFilePath } from '../../../../src/extension/pipeline/fileAnalysis/symbols';

function symbol(filePath: string, name: string): IAnalysisSymbol {
  return {
    filePath,
    id: `${filePath}:${name}`,
    kind: 'function',
    name,
  };
}

function analysis(
  filePath: string,
  values: Partial<IFileAnalysisResult>,
): IFileAnalysisResult {
  return {
    filePath,
    ...values,
  };
}

describe('pipeline/fileAnalysis/symbols', () => {
  it('indexes symbol arrays by their owning file path', () => {
    const indexed = createSymbolsByFilePath(new Map([
      ['/workspace/src/source.ts', analysis('/workspace/src/source.ts', {
        relations: [],
      })],
      ['/workspace/src/target.ts', analysis('/workspace/src/target.ts', {
        symbols: [symbol('/workspace/src/target.ts', 'target')],
      })],
      ['/workspace/src/empty.ts', analysis('/workspace/src/empty.ts', {
        symbols: [],
      })],
    ]));

    expect(indexed.get('/workspace/src/target.ts')).toEqual([
      symbol('/workspace/src/target.ts', 'target'),
    ]);
    expect(indexed.get('/workspace/src/empty.ts')).toEqual([]);
    expect(indexed.has('/workspace/src/source.ts')).toBe(false);
  });
});
