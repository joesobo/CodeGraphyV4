import { describe, expect, it } from 'vitest';
import {
  evidenceGroupKey,
  relationshipGroupKey,
  symbolKey,
} from '../../../../src/core/graphQuery/relationships/groupKeys';

describe('core/graphQuery/relationships/groupKeys', () => {
  it('includes endpoints, provenance, and symbol identity fields in stable keys', () => {
    expect(evidenceGroupKey({
      from: 'src/a.ts',
      to: 'src/b.ts',
      edgeType: 'reference',
    })).toBe('src/a.ts\u0000src/b.ts');

    expect(relationshipGroupKey({
      from: 'src/a.ts',
      to: 'src/b.ts',
      edgeType: 'reference',
      provenance: { pluginId: 'plugin.forms', sourceId: 'form-reference' },
    })).toBe('reference\u0000plugin.forms\u0000form-reference');

    expect(relationshipGroupKey({
      from: 'src/a.ts',
      to: 'src/b.ts',
      edgeType: 'reference',
    })).toBe('reference\u0000\u0000');

    expect(symbolKey({
      id: 'src/b.ts#buildUser',
      filePath: 'src/b.ts',
      name: 'buildUser',
      kind: 'function',
      range: { startLine: 10, endLine: 12 },
    })).toBe('buildUser\u0000function\u000010\u000012');

    expect(symbolKey({
      id: 'src/b.ts#anonymous',
      filePath: 'src/b.ts',
      name: 'anonymous',
    })).toBe('anonymous\u0000\u0000\u0000');
  });
});
