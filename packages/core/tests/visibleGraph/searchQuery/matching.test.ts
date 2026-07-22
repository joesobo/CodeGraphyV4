import { describe, expect, it } from 'vitest';
import type { IGraphNode } from '../../../src/graph/contracts';
import { collectMatchingNodeIds } from '../../../src/visibleGraph/searchQuery/matching';
import { normalizeSearchOptions } from '../../../src/visibleGraph/searchQuery/options';

function node(id: string, label = id, symbol?: IGraphNode['symbol']): IGraphNode {
  return {
    id,
    label,
    ...(symbol ? { symbol } : {}),
  };
}

describe('visibleGraph/searchQuery matching', () => {
  it('matches labels, ids, and symbol metadata case-insensitively by default', () => {
    const result = collectMatchingNodeIds([
      node('src/user.ts', 'User model', {
        id: 'symbol:User',
        name: 'User',
        kind: 'class',
        pluginKind: 'class_declaration',
        signature: 'class User',
        filePath: 'src/user.ts',
        language: 'typescript',
        source: 'tree-sitter',
      }),
      node('src/repo.ts', 'Repository'),
    ], 'TREE-SITTER', normalizeSearchOptions(undefined));

    expect(result).toEqual({
      matchingIds: new Set(['src/user.ts']),
      regexError: null,
    });
  });

  it('honors case-sensitive and whole-word patterns', () => {
    expect(collectMatchingNodeIds([
      node('src/user.ts', 'User Repository'),
      node('src/usage.ts', 'SuperUserRepository'),
    ], 'User', normalizeSearchOptions({ wholeWord: true, matchCase: true }))).toEqual({
      matchingIds: new Set(['src/user.ts']),
      regexError: null,
    });

    expect(collectMatchingNodeIds([
      node('src/profile.ts', 'User Repository'),
    ], 'user', normalizeSearchOptions({ matchCase: true }))).toEqual({
      matchingIds: new Set(),
      regexError: null,
    });
  });

  it('keeps field boundaries and ignores missing symbol metadata', () => {
    expect(collectMatchingNodeIds([
      node('model', 'User'),
    ], 'Usermodel', normalizeSearchOptions(undefined))).toEqual({
      matchingIds: new Set(),
      regexError: null,
    });

    expect(collectMatchingNodeIds([
      node('src/profile.ts', 'Profile'),
    ], 'undefined', normalizeSearchOptions(undefined))).toEqual({
      matchingIds: new Set(),
      regexError: null,
    });
  });

  it('returns regex errors without matching nodes', () => {
    const result = collectMatchingNodeIds(
      [node('src/user.ts', 'User')],
      '[',
      normalizeSearchOptions({ regex: true }),
    );

    expect(result.matchingIds).toEqual(new Set());
    expect(result.regexError).toContain('Invalid regular expression');
  });
});
