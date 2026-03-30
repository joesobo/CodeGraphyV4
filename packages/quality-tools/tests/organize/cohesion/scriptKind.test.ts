import { describe, expect, it } from 'vitest';
import * as ts from 'typescript';
import { getScriptKind } from '../../../src/organize/cohesion/scriptKind';

describe('getScriptKind', () => {
  it('returns JSX for .jsx files', () => {
    const result = getScriptKind('component.jsx');
    expect(result).toBe(ts.ScriptKind.JSX);
  });

  it('returns JS for .js files', () => {
    const result = getScriptKind('module.js');
    expect(result).toBe(ts.ScriptKind.JS);
  });

  it('returns TSX for .tsx files', () => {
    const result = getScriptKind('component.tsx');
    expect(result).toBe(ts.ScriptKind.TSX);
  });

  it('returns TS for .ts files', () => {
    const result = getScriptKind('module.ts');
    expect(result).toBe(ts.ScriptKind.TS);
  });

  it('returns TS for unknown extensions', () => {
    const result = getScriptKind('file.unknown');
    expect(result).toBe(ts.ScriptKind.TS);
  });

  it('returns TS for files without extension', () => {
    const result = getScriptKind('noExtension');
    expect(result).toBe(ts.ScriptKind.TS);
  });

  it('handles nested paths with .jsx extension', () => {
    const result = getScriptKind('src/components/Button.jsx');
    expect(result).toBe(ts.ScriptKind.JSX);
  });

  it('handles nested paths with .tsx extension', () => {
    const result = getScriptKind('src/components/Button.tsx');
    expect(result).toBe(ts.ScriptKind.TSX);
  });

  it('distinguishes .jsx from .ts with nested paths', () => {
    const jsxResult = getScriptKind('src/components/Button.jsx');
    const tsResult = getScriptKind('src/types/Button.ts');
    expect(jsxResult).toBe(ts.ScriptKind.JSX);
    expect(tsResult).toBe(ts.ScriptKind.TS);
  });

  it('handles compound extensions (test files) by checking .jsx at end', () => {
    // .test.jsx ends with .jsx, so should return JSX
    const result = getScriptKind('component.test.jsx');
    expect(result).toBe(ts.ScriptKind.JSX);
  });

  it('handles compound extensions (spec files) by checking .tsx at end', () => {
    // .spec.tsx ends with .tsx, so should return TSX
    const result = getScriptKind('component.spec.tsx');
    expect(result).toBe(ts.ScriptKind.TSX);
  });
});
