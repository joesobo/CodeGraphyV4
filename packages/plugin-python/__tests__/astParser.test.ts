import { describe, expect, it } from 'vitest';
import { __test, assertPythonAstRuntimeAvailable, parsePythonImports } from '../src/astParser';

describe('astParser runtime', () => {
  it('verifies python runtime availability', () => {
    expect(() => assertPythonAstRuntimeAvailable()).not.toThrow();
  });

  it('parses import statements from python source', () => {
    const imports = parsePythonImports(`
import os
import json as js
`);

    expect(imports).toEqual([
      { kind: 'import', module: 'os', line: 2 },
      { kind: 'import', module: 'json', line: 3 },
    ]);
  });

  it('parses from-import statements from python source', () => {
    const imports = parsePythonImports(`
from pkg import member
`);

    expect(imports).toEqual([
      { kind: 'from', module: 'pkg', names: ['member'], level: 0, line: 2 },
    ]);
  });

  it('returns empty imports for python syntax errors', () => {
    const imports = parsePythonImports('from broken import\n');

    expect(imports).toEqual([]);
  });
});

describe('astParser normalization helper', () => {
  it('returns empty imports for invalid parser output payloads', () => {
    expect(__test.parsePythonImportsFromRaw('not-json')).toEqual([]);
    expect(__test.parsePythonImportsFromRaw('{"imports": []}')).toEqual([]);
  });

  it('filters malformed records from raw parser output arrays', () => {
    expect(
      __test.parsePythonImportsFromRaw(
        JSON.stringify([
          { kind: 'import', module: 'os', line: 1 },
          { kind: 'from', module: 1, names: ['member'], level: 0, line: 2 },
        ]),
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

  it('rejects null record values', () => {
    expect(__test.normalizeParsedImport(null)).toBeNull();
  });

  it('rejects callable values that are not plain object records', () => {
    const callable = Object.assign(() => undefined, {
      kind: 'import',
      module: 'os',
      line: 1,
    });

    expect(__test.normalizeParsedImport(callable)).toBeNull();
  });

  it('rejects empty import modules', () => {
    expect(__test.normalizeParsedImport({ kind: 'import', module: '', line: 1 })).toBeNull();
  });

  it('rejects import records with non-string module names', () => {
    expect(__test.normalizeParsedImport({ kind: 'import', module: 1, line: 1 })).toBeNull();
  });

  it('rejects non-finite line numbers', () => {
    expect(__test.normalizeParsedImport({ kind: 'import', module: 'os', line: NaN })).toBeNull();
    expect(__test.normalizeParsedImport({ kind: 'import', module: 'os', line: Number.POSITIVE_INFINITY })).toBeNull();
  });

  it('rejects unknown record kinds even when from-import fields are present', () => {
    expect(
      __test.normalizeParsedImport({
        kind: 'other',
        module: 'pkg',
        names: ['member'],
        level: 0,
        line: 1,
      }),
    ).toBeNull();
  });

  it('rejects from-import records with non-string module names', () => {
    expect(
      __test.normalizeParsedImport({
        kind: 'from',
        module: 1,
        names: ['member'],
        level: 0,
        line: 1,
      }),
    ).toBeNull();
  });

  it('rejects from-import records with non-string imported names', () => {
    expect(
      __test.normalizeParsedImport({
        kind: 'from',
        module: 'pkg',
        names: ['member', 1],
        level: 0,
        line: 1,
      }),
    ).toBeNull();
  });

  it('rejects from-import records with non-integer levels', () => {
    expect(
      __test.normalizeParsedImport({
        kind: 'from',
        module: 'pkg',
        names: ['member'],
        level: 0.5,
        line: 1,
      }),
    ).toBeNull();
  });

  it('rejects from-import records with negative levels', () => {
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
