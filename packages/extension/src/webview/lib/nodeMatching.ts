/**
 * @fileoverview Advanced node-matching logic for graph search.
 * Supports plain substring, whole-word, and regex modes with optional case sensitivity.
 */

import type { IGraphNode } from '../../shared/types';

export interface NodeMatchOptions {
  matchCase: boolean;
  wholeWord: boolean;
  regex: boolean;
}

export interface NodeMatchResult {
  matchingIds: Set<string>;
  regexError: string | null;
}

/**
 * Compile a search pattern from the query and options.
 * Returns the compiled RegExp or null for plain substring search.
 * Throws when `options.regex` is true and the pattern is invalid.
 */
export function compilePattern(query: string, options: NodeMatchOptions): RegExp | null {
  if (options.regex) {
    const flags = options.matchCase ? '' : 'i';
    return new RegExp(query, flags);
  }

  if (options.wholeWord) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const flags = options.matchCase ? '' : 'i';
    return new RegExp(`\\b${escaped}\\b`, flags);
  }

  return null;
}

/**
 * Filter graph nodes using advanced search options.
 * Returns matching node IDs and any regex compilation error.
 */
export function filterNodesAdvanced(
  nodes: IGraphNode[],
  query: string,
  options: NodeMatchOptions,
): NodeMatchResult {
  const matchingIds = new Set<string>();
  let regexError: string | null = null;

  if (!query.trim()) {
    nodes.forEach(node => matchingIds.add(node.id));
    return { matchingIds, regexError };
  }

  let pattern: RegExp | null = null;

  try {
    pattern = compilePattern(query, options);
  } catch (e) {
    regexError = e instanceof Error ? e.message : 'Invalid regex';
    return { matchingIds, regexError };
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
