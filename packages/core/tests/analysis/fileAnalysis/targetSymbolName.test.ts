import { describe, expect, it } from 'vitest';
import type {
  IAnalysisRelationshipEvidence,
  IAnalysisSymbol,
} from '@codegraphy-dev/plugin-api';
import { resolveTargetSymbolId } from '../../../src/analysis/fileAnalysis/targetSymbolName';

function symbol(filePath: string, name: string): IAnalysisSymbol {
  return {
    filePath,
    id: `${filePath}:${name}`,
    kind: 'function',
    name,
  };
}

function relation(overrides: Partial<IAnalysisRelationshipEvidence>): IAnalysisRelationshipEvidence {
  return {
    edgeType: 'import',
    from: { kind: 'file', filePath: '/workspace/src/source.ts' },
    sourceId: 'test-source',
    target: { kind: 'file', path: '/workspace/src/target.ts', pathKind: 'absolute' },
    ...overrides,
  };
}

describe('pipeline/fileAnalysis/targetSymbolName', () => {
  it('falls back to the unique target symbol when no name metadata exists', () => {
    expect(resolveTargetSymbolId(
      relation({}),
      [symbol('/workspace/src/target.ts', 'target')],
    )).toBe('/workspace/src/target.ts:target');
  });

  it('does not pick an ambiguous named target symbol', () => {
    expect(resolveTargetSymbolId(
      relation({ metadata: { importedName: 'target' } }),
      [
        symbol('/workspace/src/target.ts', 'target'),
        symbol('/workspace/src/target.ts', 'target'),
      ],
    )).toBeUndefined();
  });

  it('uses an imported name when member metadata is an empty string', () => {
    expect(resolveTargetSymbolId(
      relation({
        metadata: {
          importedName: 'target',
          memberName: '',
        },
      }),
      [
        symbol('/workspace/src/target.ts', 'other'),
        symbol('/workspace/src/target.ts', 'target'),
      ],
    )).toBe('/workspace/src/target.ts:target');
  });

  it('ignores non-string metadata before reading the imported name', () => {
    expect(resolveTargetSymbolId(
      relation({
        metadata: {
          importedName: 'target',
          memberName: 42,
        },
      }),
      [
        symbol('/workspace/src/target.ts', 'other'),
        symbol('/workspace/src/target.ts', 'target'),
      ],
    )).toBe('/workspace/src/target.ts:target');
  });

  it('ignores namespace and default imports as named targets', () => {
    expect(resolveTargetSymbolId(
      relation({ metadata: { importedName: '*' } }),
      [
        symbol('/workspace/src/target.ts', '*'),
        symbol('/workspace/src/target.ts', 'target'),
      ],
    )).toBeUndefined();
    expect(resolveTargetSymbolId(
      relation({ metadata: { importedName: 'default' } }),
      [
        symbol('/workspace/src/target.ts', 'default'),
        symbol('/workspace/src/target.ts', 'target'),
      ],
    )).toBeUndefined();
  });
});
