import { describe, expect, it } from 'vitest';
import { compilePattern, filterNodesAdvanced } from '../../../src/webview/search/matching';
import type { IGraphNode } from '../../../src/shared/graph/types';

const nodes: IGraphNode[] = [
  { id: 'src/App.ts', label: 'App', color: '#ffffff' },
  { id: 'src/App.test.ts', label: 'App Test', color: '#ffffff' },
  { id: 'src/util.ts', label: 'utility', color: '#ffffff' },
];

describe('search matching', () => {
  it('compiles regex patterns with case-insensitive flags by default', () => {
    const result = compilePattern('app', { matchCase: false, wholeWord: false, regex: true });

    expect(result.regexError).toBeNull();
    expect(result.pattern?.flags).toContain('i');
    expect(result.pattern?.test('APP')).toBe(true);
  });

  it('compiles case-sensitive regex patterns without the i flag', () => {
    const result = compilePattern('App', { matchCase: true, wholeWord: false, regex: true });

    expect(result.regexError).toBeNull();
    expect(result.pattern?.flags).not.toContain('i');
    expect(result.pattern?.test('App')).toBe(true);
    expect(result.pattern?.test('app')).toBe(false);
  });

  it('reports regex compilation errors', () => {
    const result = compilePattern('[invalid', { matchCase: false, wholeWord: false, regex: true });

    expect(result.pattern).toBeNull();
    expect(result.regexError).toBeTruthy();
  });

  it('escapes whole-word queries before compiling a pattern', () => {
    const result = compilePattern('App.ts', { matchCase: false, wholeWord: true, regex: false });

    expect(result.regexError).toBeNull();
    expect(result.pattern?.test('App.ts')).toBe(true);
    expect(result.pattern?.test('AppXts')).toBe(false);
  });

  it('returns a null pattern for non-regex, non-whole-word searches', () => {
    const result = compilePattern('App', { matchCase: false, wholeWord: false, regex: false });

    expect(result).toEqual({ pattern: null, regexError: null });
  });

  it('returns all node ids for blank queries', () => {
    const result = filterNodesAdvanced(nodes, '   ', { matchCase: false, wholeWord: false, regex: false });

    expect([...result.matchingIds]).toEqual(['src/App.ts', 'src/App.test.ts', 'src/util.ts']);
    expect(result.regexError).toBeNull();
  });

  it('returns a regex error and no matches when regex compilation fails', () => {
    const result = filterNodesAdvanced(nodes, '[invalid', { matchCase: false, wholeWord: false, regex: true });

    expect(result.regexError).toBeTruthy();
    expect(result.matchingIds.size).toBe(0);
  });

  it('matches against labels and ids with regex patterns', () => {
    const result = filterNodesAdvanced(nodes, '^App', { matchCase: false, wholeWord: false, regex: true });

    expect([...result.matchingIds]).toEqual(['src/App.ts', 'src/App.test.ts']);
  });

  it('matches plain text case-insensitively by default', () => {
    const result = filterNodesAdvanced(nodes, 'app', { matchCase: false, wholeWord: false, regex: false });

    expect([...result.matchingIds]).toEqual(['src/App.ts', 'src/App.test.ts']);
  });

  it('respects case-sensitive plain-text matching', () => {
    const result = filterNodesAdvanced(nodes, 'app', { matchCase: true, wholeWord: false, regex: false });

    expect(result.matchingIds.size).toBe(0);
  });

  it('applies whole-word matching to labels and ids', () => {
    const result = filterNodesAdvanced(nodes, 'App', { matchCase: false, wholeWord: true, regex: false });

    expect([...result.matchingIds]).toEqual(['src/App.ts', 'src/App.test.ts']);
  });
});
