import { describe, it, expect } from 'vitest';
import { compilePattern, filterNodesAdvanced } from '../../src/webview/nodeMatching';
import type { IGraphNode } from '../../src/shared/types';

const defaultOptions = { matchCase: false, wholeWord: false, regex: false };

const nodes: IGraphNode[] = [
  { id: 'src/App.ts', label: 'App', color: '#aaa' },
  { id: 'src/AppService.ts', label: 'AppService', color: '#bbb' },
  { id: 'notes/Todo.txt', label: 'Todo', color: '#ccc' },
];

describe('compilePattern', () => {
  it('returns null pattern for plain-text searches', () => {
    const { pattern, regexError } = compilePattern('app', defaultOptions);
    expect(pattern).toBeNull();
    expect(regexError).toBeNull();
  });

  it('returns a RegExp for regex searches', () => {
    const { pattern, regexError } = compilePattern('App', { ...defaultOptions, regex: true });
    expect(pattern).toBeInstanceOf(RegExp);
    expect(regexError).toBeNull();
  });

  it('returns a regexError for invalid regex patterns', () => {
    const { pattern, regexError } = compilePattern('[', { ...defaultOptions, regex: true });
    expect(pattern).toBeNull();
    expect(regexError).toBeTruthy();
  });

  it('returns a case-insensitive RegExp by default for regex searches', () => {
    const { pattern } = compilePattern('app', { ...defaultOptions, regex: true });
    expect(pattern?.flags).toContain('i');
  });

  it('returns a case-sensitive RegExp when matchCase is true for regex searches', () => {
    const { pattern } = compilePattern('app', { ...defaultOptions, regex: true, matchCase: true });
    expect(pattern?.flags).not.toContain('i');
  });

  it('returns a whole-word RegExp when wholeWord is true', () => {
    const { pattern } = compilePattern('App', { ...defaultOptions, wholeWord: true });
    expect(pattern?.source).toContain('\\b');
  });
});

describe('filterNodesAdvanced', () => {
  it('returns all nodes when the query is blank', () => {
    const { matchingIds, regexError } = filterNodesAdvanced(nodes, '   ', defaultOptions);
    expect(Array.from(matchingIds)).toHaveLength(nodes.length);
    expect(regexError).toBeNull();
  });

  it('returns an empty set and a regexError for invalid regex', () => {
    const { matchingIds, regexError } = filterNodesAdvanced(nodes, '[', {
      ...defaultOptions,
      regex: true,
    });
    expect(matchingIds.size).toBe(0);
    expect(regexError).toBeTruthy();
  });

  it('matches nodes case-insensitively by default', () => {
    const { matchingIds } = filterNodesAdvanced(nodes, 'todo', defaultOptions);
    expect(Array.from(matchingIds)).toEqual(['notes/Todo.txt']);
  });

  it('does not match when matchCase is true and case differs', () => {
    const { matchingIds } = filterNodesAdvanced(nodes, 'app', {
      ...defaultOptions,
      matchCase: true,
    });
    expect(matchingIds.size).toBe(0);
  });

  it('matches only whole-word occurrences when wholeWord is true', () => {
    const { matchingIds } = filterNodesAdvanced(nodes, 'App', {
      ...defaultOptions,
      wholeWord: true,
    });
    expect(Array.from(matchingIds)).toEqual(['src/App.ts']);
  });

  it('matches via regex when regex option is true', () => {
    const { matchingIds } = filterNodesAdvanced(nodes, 'Todo', {
      ...defaultOptions,
      regex: true,
    });
    expect(Array.from(matchingIds)).toEqual(['notes/Todo.txt']);
  });
});
