import type { IGraphNode } from '../../graph/contracts';
import { compileSearchPattern, type NormalizedSearchOptions } from './options';

export interface SearchMatchResult {
  matchingIds: Set<string>;
  regexError: string | null;
}

export function collectMatchingNodeIds(
  nodes: IGraphNode[],
  query: string,
  options: NormalizedSearchOptions,
): SearchMatchResult {
  const { pattern, regexError } = compileSearchPattern(query, options);

  if (regexError !== null) {
    return { matchingIds: new Set<string>(), regexError };
  }

  return {
    matchingIds: collectMatchingIds(nodes, (node) => nodeMatchesQuery(node, query, options, pattern)),
    regexError: null,
  };
}

function collectMatchingIds(
  nodes: IGraphNode[],
  matches: (node: IGraphNode) => boolean,
): Set<string> {
  const matchingIds = new Set<string>();

  for (const node of nodes) {
    if (matches(node)) {
      matchingIds.add(node.id);
    }
  }

  return matchingIds;
}

function nodeMatchesQuery(
  node: IGraphNode,
  query: string,
  options: NormalizedSearchOptions,
  pattern: RegExp | null,
): boolean {
  const searchText = [
    node.label,
    node.id,
    node.symbol?.name,
    node.symbol?.kind,
    node.symbol?.pluginKind,
    node.symbol?.signature,
    node.symbol?.filePath,
    node.symbol?.language,
    node.symbol?.source,
  ].filter(Boolean).join(' ');

  if (pattern) {
    return pattern.test(searchText);
  }

  return normalizeSearchText(searchText, options).includes(normalizeSearchText(query, options));
}

function normalizeSearchText(
  text: string,
  options: Pick<NormalizedSearchOptions, 'matchCase'>,
): string {
  return options.matchCase ? text : text.toLowerCase();
}
