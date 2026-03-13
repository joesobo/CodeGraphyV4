import { describe, expect, it } from 'vitest';
import { __test, assertPythonAstRuntimeAvailable, parsePythonImports } from '../src/astParser';

describe('astParser runtime', () => {
  it('verifies python runtime availability', () => {
    expect(() => assertPythonAstRuntimeAvailable()).not.toThrow();
  });

  it('parses import and from-import statements from python source', () => {
    const imports = parsePythonImports(`
import os
from pkg import member
import json as js
`);

    expect(imports).toEqual([
      { kind: 'import', module: 'os', line: 2 },
      { kind: 'from', module: 'pkg', names: ['member'], level: 0, line: 3 },
      { kind: 'import', module: 'json', line: 4 },
    ]);
  });

  it('returns empty imports for python syntax errors', () => {
    const imports = parsePythonImports('from broken import\n');

    expect(imports).toEqual([]);
  });
});

describe('astParser normalization helper', () => {
  it('parses raw parser output safely', () => {
    expect(__test.parsePythonImportsFromRaw('not-json')).toEqual([]);
    expect(__test.parsePythonImportsFromRaw('{"imports": []}')).toEqual([]);
    expect(
      __test.parsePythonImportsFromRaw(
        JSON.stringify([{ kind: 'import', module: 'os', line: 1 }]),
      ),
    ).toEqual([{ kind: 'import', module: 'os', line: 1 }]);
  });

  it('accepts well-formed import records', () => {
    expect(__test.normalizeParsedImport({ kind: 'import', module: 'os', line: 1 })).toEqual({
      kind: 'import',
      module: 'os',
      line: 1,
    });

    expect(
      __test.normalizeParsedImport({
        kind: 'from',
        module: 'pkg',
        names: ['member'],
        level: 1,
        line: 2,
      }),
    ).toEqual({
      kind: 'from',
      module: 'pkg',
      names: ['member'],
      level: 1,
      line: 2,
    });
  });

  it('rejects malformed import records', () => {
    expect(__test.normalizeParsedImport(null)).toBeNull();
    expect(__test.normalizeParsedImport({ kind: 'import', module: '', line: 1 })).toBeNull();
    expect(__test.normalizeParsedImport({ kind: 'import', module: 'os', line: NaN })).toBeNull();
    expect(
      __test.normalizeParsedImport({
        kind: 'from',
        module: 'pkg',
        names: ['member', 1],
        level: 0,
        line: 1,
      }),
    ).toBeNull();
    expect(
      __test.normalizeParsedImport({
        kind: 'from',
        module: 'pkg',
        names: ['member'],
        level: -1,
        line: 1,
      }),
    ).toBeNull();
  });
});
