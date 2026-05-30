import { describe, expect, it } from 'vitest';
import type { IAnalysisRelationshipEvidence } from '@codegraphy-dev/plugin-api';
import { createProvenance } from '../../../src/graphQuery/relationships/provenance';

function relation(pluginId: string | undefined): IAnalysisRelationshipEvidence {
  return {
    edgeType: 'reference',
    pluginId,
    sourceId: 'source-id',
    from: { kind: 'file', filePath: 'src/a.ts' },
    target: { kind: 'file', path: 'src/b.ts' },
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
