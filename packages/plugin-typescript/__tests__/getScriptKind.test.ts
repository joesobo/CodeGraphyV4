import { describe, it, expect } from 'vitest';
import * as ts from 'typescript';
import { getScriptKind } from '../src/getScriptKind';

describe('getScriptKind', () => {
  it('should return TSX for .tsx files', () => {
    expect(getScriptKind('Component.tsx')).toBe(ts.ScriptKind.TSX);
  });

  it('should return TS for .ts files', () => {
    expect(getScriptKind('module.ts')).toBe(ts.ScriptKind.TS);
  });

  it('should return JSX for .jsx files', () => {
    expect(getScriptKind('Component.jsx')).toBe(ts.ScriptKind.JSX);
  });

  it('should return JS for .js files', () => {
    expect(getScriptKind('module.js')).toBe(ts.ScriptKind.JS);
  });

  it('should return JS for .mjs files', () => {
    expect(getScriptKind('module.mjs')).toBe(ts.ScriptKind.JS);
  });

  it('should return JS for .cjs files', () => {
    expect(getScriptKind('module.cjs')).toBe(ts.ScriptKind.JS);
  });

  it('should default to TS for unknown extensions', () => {
    expect(getScriptKind('file.unknown')).toBe(ts.ScriptKind.TS);
  });

  it('should handle uppercase extensions', () => {
    expect(getScriptKind('file.TSX')).toBe(ts.ScriptKind.TSX);
  });

  it('should handle paths with directories', () => {
    expect(getScriptKind('/some/path/to/file.tsx')).toBe(ts.ScriptKind.TSX);
  });
});
