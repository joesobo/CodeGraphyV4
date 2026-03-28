import { describe, expect, it } from 'vitest';
import { getFunctionCoverage } from '../../../src/crap/coverage/function';
import type { FunctionInfo } from '../../../src/crap/analysis/extractFunctions';
import type { IstanbulFileCoverage } from '../../../src/crap/coverage/read';

const fn: FunctionInfo = {
  complexity: 2,
  endLine: 6,
  file: '/repo/packages/example/src/file.ts',
  line: 2,
  name: 'choose'
};

function coverage(statementHits: IstanbulFileCoverage['s']): IstanbulFileCoverage {
  return {
    path: fn.file,
    s: statementHits,
    statementMap: {
      '0': { start: { column: 0, line: 1 }, end: { column: 10, line: 1 } },
      '1': { start: { column: 0, line: 2 }, end: { column: 10, line: 2 } },
      '2': { start: { column: 0, line: 5 }, end: { column: 10, line: 5 } },
      '3': { start: { column: 0, line: 6 }, end: { column: 10, line: 6 } },
      '4': { start: { column: 0, line: 8 }, end: { column: 10, line: 8 } }
    }
  };
}

describe('getFunctionCoverage', () => {
  it('uses only statements inside the function range including boundary lines', () => {
    expect(getFunctionCoverage(fn, coverage({
      '0': 1,
      '1': 1,
      '2': 0,
      '3': 1,
      '4': 1
    }))).toBeCloseTo(66.6666666667);
  });

  it('returns zero when no statements are mapped inside the function', () => {
    expect(getFunctionCoverage(fn, { path: fn.file, s: {}, statementMap: {} })).toBe(0);
  });
});
