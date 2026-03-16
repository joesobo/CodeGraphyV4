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

  it('matches case-sensitive plain text when matchCase is true and case matches', () => {
    const { matchingIds } = filterNodesAdvanced(nodes, 'App', {
      ...defaultOptions,
      matchCase: true,
    });
    expect(Array.from(matchingIds)).toEqual(['src/App.ts', 'src/AppService.ts']);
  });

  it('searches both label and id for matches', () => {
    // 'src' appears in the id but not in the label
    const { matchingIds } = filterNodesAdvanced(nodes, 'src', defaultOptions);
    expect(matchingIds.size).toBe(2); // src/App.ts and src/AppService.ts
    expect(matchingIds.has('notes/Todo.txt')).toBe(false);
  });

  it('matches nodes by their id path component', () => {
    const { matchingIds } = filterNodesAdvanced(nodes, 'notes', defaultOptions);
    expect(Array.from(matchingIds)).toEqual(['notes/Todo.txt']);
  });

  it('returns a null regexError for successful regex searches', () => {
    const { regexError } = filterNodesAdvanced(nodes, 'App', {
      ...defaultOptions,
      regex: true,
    });
    expect(regexError).toBeNull();
  });

  it('returns a null regexError for plain-text searches', () => {
    const { regexError } = filterNodesAdvanced(nodes, 'App', defaultOptions);
    expect(regexError).toBeNull();
  });

  it('returns a non-null regexError string for regex errors that are not Error instances', () => {
    // compilePattern handles errors that are not Error instances
    const { regexError } = compilePattern('[', { ...defaultOptions, regex: true });
    expect(regexError).toBeTruthy();
    expect(typeof regexError).toBe('string');
  });

  it('escapes special regex characters in wholeWord mode', () => {
    const specialNodes: IGraphNode[] = [
      { id: 'file.test.ts', label: 'file.test.ts', color: '#aaa' },
    ];
    const { matchingIds } = filterNodesAdvanced(specialNodes, 'file.test', {
      ...defaultOptions,
      wholeWord: true,
    });
    // 'file.test' should be escaped so the dot doesn't match arbitrary characters
    expect(matchingIds.has('file.test.ts')).toBe(true);
  });

  it('returns case-insensitive wholeWord match by default', () => {
    const { pattern } = compilePattern('app', { ...defaultOptions, wholeWord: true });
    expect(pattern?.flags).toContain('i');
  });

  it('returns case-sensitive wholeWord match when matchCase is true', () => {
    const { pattern } = compilePattern('app', { ...defaultOptions, wholeWord: true, matchCase: true });
    expect(pattern?.flags).not.toContain('i');
  });
});
