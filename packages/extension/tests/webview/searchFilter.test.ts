import { describe, it, expect } from 'vitest';
import type { IGraphNode } from '../../src/shared/types';

// Re-implement the filter function for testing (same logic as App.tsx)
interface SearchOptions {
  matchCase: boolean;
  wholeWord: boolean;
  regex: boolean;
}

function filterNodesAdvanced(
  nodes: IGraphNode[],
  query: string,
  options: SearchOptions
): { matchingIds: Set<string>; regexError: string | null } {
  const matchingIds = new Set<string>();
  let regexError: string | null = null;

  if (!query.trim()) {
    nodes.forEach(node => matchingIds.add(node.id));
    return { matchingIds, regexError };
  }

  let pattern: RegExp | null = null;

  if (options.regex) {
    try {
      const flags = options.matchCase ? '' : 'i';
      pattern = new RegExp(query, flags);
    } catch (e) {
      regexError = e instanceof Error ? e.message : 'Invalid regex';
      return { matchingIds, regexError };
    }
  } else if (options.wholeWord) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const flags = options.matchCase ? '' : 'i';
    pattern = new RegExp(`\\b${escaped}\\b`, flags);
  }

  for (const node of nodes) {
    const searchText = `${node.label} ${node.id}`;
    let isMatch = false;

    if (pattern) {
      isMatch = pattern.test(searchText);
    } else {
      const normalizedText = options.matchCase ? searchText : searchText.toLowerCase();
      const normalizedQuery = options.matchCase ? query : query.toLowerCase();
      isMatch = normalizedText.includes(normalizedQuery);
    }

    if (isMatch) {
      matchingIds.add(node.id);
    }
  }

  return { matchingIds, regexError };
}

describe('filterNodesAdvanced', () => {
  const testNodes: IGraphNode[] = [
    { id: 'src/App.tsx', label: 'App.tsx', color: '#3B82F6' },
    { id: 'src/app.css', label: 'app.css', color: '#3B82F6' },
    { id: 'src/components/Button.tsx', label: 'Button.tsx', color: '#3B82F6' },
    { id: 'src/utils/helpers.ts', label: 'helpers.ts', color: '#3B82F6' },
    { id: 'src/test/App.test.tsx', label: 'App.test.tsx', color: '#3B82F6' },
  ];

  describe('basic substring search (no options)', () => {
    const noOptions: SearchOptions = { matchCase: false, wholeWord: false, regex: false };

    it('should match case-insensitively by default', () => {
      const result = filterNodesAdvanced(testNodes, 'app', noOptions);
      expect(result.matchingIds.size).toBe(3); // App.tsx, app.css, App.test.tsx
      expect(result.matchingIds.has('src/App.tsx')).toBe(true);
      expect(result.matchingIds.has('src/app.css')).toBe(true);
      expect(result.matchingIds.has('src/test/App.test.tsx')).toBe(true);
    });

    it('should NOT match files that do not contain the search term (regression test for PR #82)', () => {
      // Bug: searching "readme" was showing Header.tsx due to fuzzy matching
      const nodesWithHeader: IGraphNode[] = [
        { id: 'src/components/Header.tsx', label: 'Header.tsx', color: '#3B82F6' },
        { id: 'README.md', label: 'README.md', color: '#3B82F6' },
        { id: 'docs/readme.txt', label: 'readme.txt', color: '#3B82F6' },
      ];
      const result = filterNodesAdvanced(nodesWithHeader, 'readme', noOptions);
      expect(result.matchingIds.has('README.md')).toBe(true);
      expect(result.matchingIds.has('docs/readme.txt')).toBe(true);
      expect(result.matchingIds.has('src/components/Header.tsx')).toBe(false); // Should NOT match!
      expect(result.matchingIds.size).toBe(2);
    });

    it('should match substrings', () => {
      const result = filterNodesAdvanced(testNodes, 'help', noOptions);
      expect(result.matchingIds.size).toBe(1);
      expect(result.matchingIds.has('src/utils/helpers.ts')).toBe(true);
    });

    it('should return all nodes for empty query', () => {
      const result = filterNodesAdvanced(testNodes, '', noOptions);
      expect(result.matchingIds.size).toBe(5);
    });
  });

  describe('Match Case option', () => {
    const matchCaseOptions: SearchOptions = { matchCase: true, wholeWord: false, regex: false };

    it('should only match exact case', () => {
      const result = filterNodesAdvanced(testNodes, 'App', matchCaseOptions);
      expect(result.matchingIds.size).toBe(2); // App.tsx, App.test.tsx
      expect(result.matchingIds.has('src/App.tsx')).toBe(true);
      expect(result.matchingIds.has('src/test/App.test.tsx')).toBe(true);
      expect(result.matchingIds.has('src/app.css')).toBe(false);
    });

    it('should not match different case', () => {
      const result = filterNodesAdvanced(testNodes, 'APP', matchCaseOptions);
      expect(result.matchingIds.size).toBe(0);
    });
  });

  describe('Whole Word option', () => {
    const wholeWordOptions: SearchOptions = { matchCase: false, wholeWord: true, regex: false };

    it('should only match whole words', () => {
      // Searching "App" as whole word matches files where "App" appears as a word
      // In search text "${label} ${id}", word boundaries are at dots, slashes, and spaces
      // So "App" matches: App.tsx (label), src/App.tsx (id), app.css (id - case insensitive)
      const result = filterNodesAdvanced(testNodes, 'App', wholeWordOptions);
      expect(result.matchingIds.size).toBe(3); // App.tsx, app.css, App.test.tsx
      expect(result.matchingIds.has('src/App.tsx')).toBe(true);
      expect(result.matchingIds.has('src/app.css')).toBe(true);
      expect(result.matchingIds.has('src/test/App.test.tsx')).toBe(true);
    });

    it('should not match partial words', () => {
      const result = filterNodesAdvanced(testNodes, 'help', wholeWordOptions);
      expect(result.matchingIds.size).toBe(0); // 'helpers' doesn't match 'help' as whole word
    });

    it('should match whole word "helpers"', () => {
      const result = filterNodesAdvanced(testNodes, 'helpers', wholeWordOptions);
      expect(result.matchingIds.size).toBe(1);
      expect(result.matchingIds.has('src/utils/helpers.ts')).toBe(true);
    });
  });

  describe('Whole Word + Match Case', () => {
    const bothOptions: SearchOptions = { matchCase: true, wholeWord: true, regex: false };

    it('should match whole word with exact case', () => {
      const result = filterNodesAdvanced(testNodes, 'App', bothOptions);
      expect(result.matchingIds.size).toBe(2);
      expect(result.matchingIds.has('src/App.tsx')).toBe(true);
      expect(result.matchingIds.has('src/test/App.test.tsx')).toBe(true);
    });

    it('should not match wrong case whole word', () => {
      const result = filterNodesAdvanced(testNodes, 'app', bothOptions);
      expect(result.matchingIds.size).toBe(1); // only app.css has lowercase 'app'
      expect(result.matchingIds.has('src/app.css')).toBe(true);
    });
  });

  describe('Regex option', () => {
    const regexOptions: SearchOptions = { matchCase: false, wholeWord: false, regex: true };

    it('should match using regex pattern', () => {
      // Search text is "${label} ${id}", so "^App" matches files starting with "App" label
      // Regex is case-insensitive by default, so "app.css" also matches
      const result = filterNodesAdvanced(testNodes, '^App', regexOptions);
      expect(result.matchingIds.size).toBe(3);
      expect(result.matchingIds.has('src/App.tsx')).toBe(true);
      expect(result.matchingIds.has('src/app.css')).toBe(true);
      expect(result.matchingIds.has('src/test/App.test.tsx')).toBe(true);
    });

    it('should support regex wildcards', () => {
      const result = filterNodesAdvanced(testNodes, 'App.*tsx', regexOptions);
      expect(result.matchingIds.size).toBe(2);
      expect(result.matchingIds.has('src/App.tsx')).toBe(true);
      expect(result.matchingIds.has('src/test/App.test.tsx')).toBe(true);
    });

    it('should support character classes', () => {
      const result = filterNodesAdvanced(testNodes, '\\.(ts|tsx)$', regexOptions);
      expect(result.matchingIds.size).toBe(4); // all .ts and .tsx files
    });

    it('should return error for invalid regex', () => {
      const result = filterNodesAdvanced(testNodes, '[invalid', regexOptions);
      expect(result.regexError).not.toBeNull();
      expect(result.matchingIds.size).toBe(0);
    });

    it('should be case-insensitive by default', () => {
      const result = filterNodesAdvanced(testNodes, 'APP', regexOptions);
      expect(result.matchingIds.size).toBe(3); // App.tsx, app.css, App.test.tsx
    });
  });

  describe('Regex + Match Case', () => {
    const regexCaseOptions: SearchOptions = { matchCase: true, wholeWord: false, regex: true };

    it('should match regex with case sensitivity', () => {
      const result = filterNodesAdvanced(testNodes, 'App', regexCaseOptions);
      expect(result.matchingIds.size).toBe(2);
      expect(result.matchingIds.has('src/App.tsx')).toBe(true);
      expect(result.matchingIds.has('src/test/App.test.tsx')).toBe(true);
      expect(result.matchingIds.has('src/app.css')).toBe(false);
    });
  });
});
