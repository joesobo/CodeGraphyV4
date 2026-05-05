import { describe, expect, it } from 'vitest';
import type { IGraphNode } from '../../../../src/shared/graph/contracts';
import { collectMatchingNodeIds } from '../../../../src/shared/visibleGraph/searchQuery/matching';
import { normalizeSearchOptions } from '../../../../src/shared/visibleGraph/searchQuery/options';

function node(id: string, label = id): IGraphNode {
  return {
    id,
    label,
    color: '#111111',
    nodeType: 'file',
  };
}

const nodes = [
  node('src/FooPanel.tsx', 'Foo Panel'),
  node('src/foo-model.ts', 'foo model'),
  node('src/bar.ts', 'Bar'),
];

function matchingIds(result: ReturnType<typeof collectMatchingNodeIds>): string[] {
  return Array.from(result.matchingIds);
}

describe('shared/visibleGraph/searchQuery/matching', () => {
  it('matches literal substrings by label and path', () => {
    const result = collectMatchingNodeIds(nodes, 'ooP', normalizeSearchOptions({}));

    expect(result.regexError).toBeNull();
    expect(matchingIds(result)).toEqual(['src/FooPanel.tsx']);
  });

  it('keeps literal search as literal when the query looks like regex syntax', () => {
    const result = collectMatchingNodeIds(nodes, 'Foo.*tsx', normalizeSearchOptions({}));

    expect(matchingIds(result)).toEqual([]);
  });

  it('supports case-sensitive literal search', () => {
    const result = collectMatchingNodeIds(nodes, 'foo', normalizeSearchOptions({ matchCase: true }));

    expect(matchingIds(result)).toEqual(['src/foo-model.ts']);
  });

  it('supports case-insensitive whole-word search', () => {
    const result = collectMatchingNodeIds(nodes, 'MODEL', normalizeSearchOptions({ wholeWord: true }));

    expect(matchingIds(result)).toEqual(['src/foo-model.ts']);
  });

  it('does not treat whole-word search as a plain substring search', () => {
    const result = collectMatchingNodeIds(nodes, 'mode', normalizeSearchOptions({ wholeWord: true }));

    expect(matchingIds(result)).toEqual([]);
  });

  it('supports case-sensitive whole-word search', () => {
    const result = collectMatchingNodeIds(
      nodes,
      'MODEL',
      normalizeSearchOptions({ wholeWord: true, matchCase: true }),
    );

    expect(matchingIds(result)).toEqual([]);
  });

  it('uses regex patterns when regex search is enabled', () => {
    const result = collectMatchingNodeIds(nodes, 'Foo.*tsx', normalizeSearchOptions({ regex: true }));

    expect(matchingIds(result)).toEqual(['src/FooPanel.tsx']);
  });

  it('returns an empty match set for invalid regex search', () => {
    const result = collectMatchingNodeIds(nodes, '[', normalizeSearchOptions({ regex: true }));

    expect(matchingIds(result)).toEqual([]);
    expect(result.regexError).toMatch(/Invalid regular expression/);
  });
});
