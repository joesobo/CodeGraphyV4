import { describe, expect, it } from 'vitest';
import {
  includesExpectedEdgeIds,
  missingExpectedEdgeIds,
} from '../src/e2e/suite/graph/readiness';

const REQUIRED_EDGE_IDS = [
  'src/index.ts->src/palette.ts#import',
  'src/index.ts->src/types.ts#import',
];

describe('E2E graph readiness', () => {
  it('does not accept the empty graph publication sent while Indexing starts', () => {
    expect(includesExpectedEdgeIds([], REQUIRED_EDGE_IDS)).toBe(false);
  });

  it('accepts a graph publication only after all required scenario Edges arrive', () => {
    expect(includesExpectedEdgeIds([
      'src/index.ts->src/palette.ts#import:tree-sitter',
      'src/index.ts->src/types.ts#import',
    ], REQUIRED_EDGE_IDS)).toBe(true);
  });

  it('keeps waiting when a graph publication contains only part of the scenario', () => {
    expect(includesExpectedEdgeIds([
      'src/index.ts->src/palette.ts#import',
    ], REQUIRED_EDGE_IDS)).toBe(false);
  });

  it('reports the exact required Edges absent from the last graph publication', () => {
    expect(missingExpectedEdgeIds([
      'src/index.ts->src/palette.ts#import',
    ], REQUIRED_EDGE_IDS)).toEqual([
      'src/index.ts->src/types.ts#import',
    ]);
  });
});
