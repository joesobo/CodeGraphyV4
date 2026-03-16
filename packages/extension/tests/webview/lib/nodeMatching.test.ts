import { describe, it, expect } from 'vitest';
import { filterNodesAdvanced, compilePattern } from '../../../src/webview/lib/nodeMatching';
import type { IGraphNode } from '../../../src/shared/types';

const testNodes: IGraphNode[] = [
  { id: 'src/App.tsx', label: 'App.tsx', color: '#3B82F6' },
  { id: 'src/app.css', label: 'app.css', color: '#3B82F6' },
  { id: 'src/components/Button.tsx', label: 'Button.tsx', color: '#3B82F6' },
  { id: 'src/utils/helpers.ts', label: 'helpers.ts', color: '#3B82F6' },
  { id: 'src/test/App.test.tsx', label: 'App.test.tsx', color: '#3B82F6' },
];

describe('compilePattern', () => {
  it('returns null for plain substring search (no regex, no wholeWord)', () => {
    const pattern = compilePattern('app', { matchCase: false, wholeWord: false, regex: false });
    expect(pattern).toBeNull();
  });

  it('returns a case-insensitive RegExp for regex mode without matchCase', () => {
    const pattern = compilePattern('App', { matchCase: false, wholeWord: false, regex: true });
    expect(pattern).toBeInstanceOf(RegExp);
    expect(pattern!.flags).toContain('i');
  });

  it('returns a case-sensitive RegExp for regex mode with matchCase', () => {
    const pattern = compilePattern('App', { matchCase: true, wholeWord: false, regex: true });
    expect(pattern).toBeInstanceOf(RegExp);
    expect(pattern!.flags).not.toContain('i');
  });

  it('returns a word-boundary RegExp for wholeWord mode', () => {
    const pattern = compilePattern('helpers', { matchCase: false, wholeWord: true, regex: false });
    expect(pattern).toBeInstanceOf(RegExp);
    expect(pattern!.source).toContain('\\b');
  });

  it('throws for an invalid regex pattern', () => {
    expect(() =>
      compilePattern('[invalid', { matchCase: false, wholeWord: false, regex: true })
    ).toThrow();
  });

  it('escapes special regex characters in wholeWord mode', () => {
    const pattern = compilePattern('a.b', { matchCase: false, wholeWord: true, regex: false });
    expect(pattern).toBeInstanceOf(RegExp);
    // The dot should be escaped so it matches only a literal dot
    expect(pattern!.test('axb')).toBe(false);
  });
});

describe('filterNodesAdvanced', () => {
  const noOptions = { matchCase: false, wholeWord: false, regex: false };

  describe('basic substring search', () => {
    it('returns all nodes for an empty query', () => {
      const result = filterNodesAdvanced(testNodes, '', noOptions);
      expect(result.matchingIds.size).toBe(5);
      expect(result.regexError).toBeNull();
    });

    it('returns all nodes for a whitespace-only query', () => {
      const result = filterNodesAdvanced(testNodes, '   ', noOptions);
      expect(result.matchingIds.size).toBe(5);
    });

    it('matches nodes case-insensitively by default', () => {
      const result = filterNodesAdvanced(testNodes, 'app', noOptions);
      expect(result.matchingIds).toEqual(new Set(['src/App.tsx', 'src/app.css', 'src/test/App.test.tsx']));
    });

    it('does not match nodes that do not contain the query', () => {
      const result = filterNodesAdvanced(testNodes, 'readme', noOptions);
      expect(result.matchingIds.size).toBe(0);
    });

    it('matches a substring inside the node label', () => {
      const result = filterNodesAdvanced(testNodes, 'help', noOptions);
      expect(result.matchingIds).toEqual(new Set(['src/utils/helpers.ts']));
    });
  });

  describe('Match Case option', () => {
    const matchCase = { matchCase: true, wholeWord: false, regex: false };

    it('only matches nodes with the exact case', () => {
      const result = filterNodesAdvanced(testNodes, 'App', matchCase);
      expect(result.matchingIds).toEqual(new Set(['src/App.tsx', 'src/test/App.test.tsx']));
    });

    it('does not match nodes with differing case', () => {
      const result = filterNodesAdvanced(testNodes, 'APP', matchCase);
      expect(result.matchingIds.size).toBe(0);
    });
  });

  describe('Whole Word option', () => {
    const wholeWord = { matchCase: false, wholeWord: true, regex: false };

    it('does not match partial words', () => {
      const result = filterNodesAdvanced(testNodes, 'help', wholeWord);
      expect(result.matchingIds.size).toBe(0);
    });

    it('matches an exact whole word', () => {
      const result = filterNodesAdvanced(testNodes, 'helpers', wholeWord);
      expect(result.matchingIds).toEqual(new Set(['src/utils/helpers.ts']));
    });
  });

  describe('Regex option', () => {
    const regexOptions = { matchCase: false, wholeWord: false, regex: true };

    it('filters using the regex pattern', () => {
      const result = filterNodesAdvanced(testNodes, '\\.tsx$', regexOptions);
      const ids = [...result.matchingIds];
      expect(ids.every(id => id.endsWith('.tsx'))).toBe(true);
    });

    it('returns a regexError for an invalid pattern', () => {
      const result = filterNodesAdvanced(testNodes, '[invalid', regexOptions);
      expect(result.regexError).not.toBeNull();
      expect(result.matchingIds.size).toBe(0);
    });

    it('returns no regexError for a valid pattern', () => {
      const result = filterNodesAdvanced(testNodes, 'App.*tsx', regexOptions);
      expect(result.regexError).toBeNull();
    });
  });
});
