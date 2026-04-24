import { describe, expect, it } from 'vitest';
import { readFileDependencies } from '../../src/query/fileDependencies';
import { loadQueryContext } from '../../src/query/load';
import { createTempRepo } from '../support/database';
import { createSampleSnapshot } from '../support/sampleGraph';

describe('query/fileDependencies', () => {
  it('returns outgoing file relations and supporting symbols', () => {
    const repo = createTempRepo(createSampleSnapshot());
    const context = loadQueryContext(repo.workspaceRoot);

    const result = readFileDependencies('src/b.ts', context);

    expect(result.summary).toMatchObject({
      filePath: 'src/b.ts',
      relationCount: 1,
      relatedFileCount: 1,
    });
    expect(result.edges).toEqual([
      { from: 'src/b.ts', to: 'src/a.ts', kind: 'import', supportCount: 1 },
    ]);
    expect(result.symbols.map((symbol) => symbol.id)).toEqual([
      'symbol:src/b.ts:useExport',
      'symbol:src/a.ts:exportAsJson',
    ]);
  });
});
