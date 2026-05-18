import { describe, expect, it } from 'vitest';
import type { IAnalysisRelation } from '@codegraphy/plugin-api';
import { createProvenance } from '../../../src/graphQuery/relationships/provenance';

function relation(pluginId: string | undefined): IAnalysisRelation {
  return {
    kind: 'reference',
    pluginId,
    sourceId: 'source-id',
    fromFilePath: 'src/a.ts',
    toFilePath: 'src/b.ts',
  };
}

describe('core/graphQuery/relationships/provenance', () => {
  it('keeps plugin provenance and hides missing or core tree-sitter provenance', () => {
    expect(createProvenance(relation('plugin.routes'))).toEqual({
      pluginId: 'plugin.routes',
      sourceId: 'source-id',
    });
    expect(createProvenance(relation('codegraphy.treesitter'))).toBeUndefined();
    expect(createProvenance(relation(undefined))).toBeUndefined();
  });
});
