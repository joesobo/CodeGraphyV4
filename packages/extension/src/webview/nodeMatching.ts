/**
 * @fileoverview Pure node-matching logic extracted from appSearch.
 * Compiles search patterns and tests node labels/ids.
 * @module webview/nodeMatching
 */

import type { IGraphNode } from '../shared/types';
import type { SearchOptions } from './components/SearchBar';

/**
 * Compiles the user query into a RegExp (or null for plain-text matching),
 * together with any regex parse error.
 */
export function compilePattern(
  query: string,
  options: SearchOptions,
): { pattern: RegExp | null; regexError: string | null } {
  if (options.regex) {
    try {
      const flags = options.matchCase ? '' : 'i';
      return { pattern: new RegExp(query, flags), regexError: null };
    } catch (error) {
      const regexError = error instanceof Error ? error.message : 'Invalid regex';
      return { pattern: null, regexError };
    }
  }

  if (options.wholeWord) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const flags = options.matchCase ? '' : 'i';
    return { pattern: new RegExp(`\\b${escaped}\\b`, flags), regexError: null };
  }

  return { pattern: null, regexError: null };
}

/**
 * Returns the Set of node ids that match the given query and options.
 * On regex error, returns an empty Set with a non-null regexError.
 */
export function filterNodesAdvanced(
  nodes: IGraphNode[],
  query: string,
  options: SearchOptions,
): { matchingIds: Set<string>; regexError: string | null } {
  const matchingIds = new Set<string>();

  if (!query.trim()) {
    nodes.forEach((node) => matchingIds.add(node.id));
    return { matchingIds, regexError: null };
  }

  const { pattern, regexError } = compilePattern(query, options);
  if (regexError !== null) {
    return { matchingIds, regexError };
  }

  for (const node of nodes) {
    const searchText = `${node.label} ${node.id}`;
    let isMatch: boolean;

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

  return { matchingIds, regexError: null };
}
