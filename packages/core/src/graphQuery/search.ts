import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import type { IGraphNode } from '../graph/contracts';
import type { GraphQueryData } from './data';
import type {
  GraphQuerySearchConfig,
  GraphQuerySearchMatch,
  GraphQuerySearchReport,
  GraphQuerySymbolReportItem,
} from './model';
import { toNodeReportItem } from './nodeReport';
import { paginate } from './pagination';
import { toSymbolReportBase } from './symbols/metadata';
import { findFuzzySymbols } from './search/fuzzy';
import { rankSearchDocuments } from './search/ranking';

const MAX_EXCERPT_LENGTH = 240;
const SOURCE_FILE_EXTENSION = /\.(?:[cm]?[jt]sx?|py|go|rs|java|kt|kts|swift|dart|cs|c|cc|cpp|cxx|h|hh|hpp|hxx|m|mm|php|rb|lua|scala|sc|hs|lhs|pas|pp)$/iu;

interface RankedMatch {
  match: GraphQuerySearchMatch;
  rank: number;
  sortKey: string;
}

interface PatternMatcher {
  exact(value: string): boolean;
  find(value: string): number;
  matches(value: string): boolean;
}

function escapeRegularExpression(value: string): string {
  return value.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
}

function createPatternMatcher(pattern: string): PatternMatcher {
  const normalizedPattern = pattern.toLocaleLowerCase();
  if (!pattern.includes('*')) {
    return {
      exact: value => value.toLocaleLowerCase() === normalizedPattern,
      find: value => value.toLocaleLowerCase().indexOf(normalizedPattern),
      matches: value => value.toLocaleLowerCase().includes(normalizedPattern),
    };
  }

  const expression = pattern.split('*').map(escapeRegularExpression).join('.*');
  const regex = new RegExp(expression, 'iu');
  return {
    exact: value => new RegExp(`^(?:${expression})$`, 'iu').test(value),
    find: value => regex.exec(value)?.index ?? -1,
    matches: value => regex.test(value),
  };
}

function symbolReportItem(symbol: IAnalysisSymbol): GraphQuerySymbolReportItem {
  return {
    ...toSymbolReportBase(symbol),
    filePath: symbol.filePath,
  };
}

function nodeMatch(node: IGraphNode, matcher: PatternMatcher): RankedMatch | undefined {
  if (node.symbol || (!matcher.matches(node.id) && !matcher.matches(node.label))) {
    return undefined;
  }
  const exact = matcher.exact(node.id) || matcher.exact(node.label);
  return {
    match: { type: 'node', node: toNodeReportItem(node) },
    rank: exact ? 1 : 3,
    sortKey: `${node.id}\u0000${node.label}`,
  };
}

function symbolMatch(symbol: IAnalysisSymbol, matcher: PatternMatcher): RankedMatch | undefined {
  if (!matcher.matches(symbol.name)) {
    return undefined;
  }
  return {
    match: { type: 'symbol', symbol: symbolReportItem(symbol) },
    rank: matcher.exact(symbol.name) ? 0 : 2,
    sortKey: `${symbol.filePath}\u0000${symbol.name}\u0000${symbol.kind ?? ''}\u0000${symbol.id}`,
  };
}

function readSearchTerms(pattern: string): string[] {
  return pattern.toLocaleLowerCase().split(/[^\p{L}\p{N}_]+/u).flatMap((term) => {
    if (term.length < 3) return [];
    return term.endsWith('ing') && term.length > 5 ? [term, term.slice(0, -3)] : [term];
  });
}

function sourceMatchRank(filePath: string, pattern: string): number {
  const normalizedPath = filePath.toLocaleLowerCase();
  const pathTerms = normalizedPath.split(/[^\p{L}\p{N}_]+/u);
  const searchTerms = readSearchTerms(pattern);
  if (searchTerms.some(term => pathTerms.includes(term))) return 3;
  if (searchTerms.some(term => normalizedPath.includes(term))) return 4;
  return SOURCE_FILE_EXTENSION.test(filePath) ? 5 : 6;
}

function createExcerpt(lineText: string, columnIndex: number): string {
  if (lineText.length <= MAX_EXCERPT_LENGTH) return lineText;
  const start = Math.max(0, Math.min(columnIndex - 80, lineText.length - MAX_EXCERPT_LENGTH));
  const prefix = start > 0 ? '…' : '';
  const contentLength = MAX_EXCERPT_LENGTH - prefix.length - 1;
  const end = Math.min(lineText.length, start + contentLength);
  const suffix = end < lineText.length ? '…' : '';
  return `${prefix}${lineText.slice(start, end)}${suffix}`;
}

function sourceMatches(data: GraphQueryData, pattern: string, matcher: PatternMatcher): RankedMatch[] {
  return (data.sourceText?.files ?? []).flatMap(({ filePath, content }) => (
    content.split(/\r?\n/u).flatMap((lineText, lineIndex) => {
      const columnIndex = matcher.find(lineText);
      if (columnIndex < 0) return [];
      return [{
        match: {
          type: 'text' as const,
          filePath,
          line: lineIndex + 1,
          column: columnIndex + 1,
          excerpt: createExcerpt(lineText, columnIndex),
        },
        rank: sourceMatchRank(filePath, pattern),
        sortKey: `${filePath}\u0000${String(lineIndex).padStart(10, '0')}\u0000${String(columnIndex).padStart(10, '0')}`,
      }];
    })
  ));
}

function phraseFallbackMatches(
  data: GraphQueryData,
  pattern: string,
  existingMatches: readonly RankedMatch[],
): RankedMatch[] {
  if (pattern.includes('*') || existingMatches.length >= 5) return [];
  const nodesByPath = new Map(data.graphData.nodes
    .filter(node => !node.symbol)
    .map(node => [node.id, node]));
  const existingNodePaths = new Set(existingMatches.flatMap(item => (
    item.match.type === 'node' ? [item.match.node.path] : []
  )));
  return rankSearchDocuments(pattern, (data.sourceText?.files ?? []).map(file => ({
    id: file.filePath,
    path: file.filePath,
    text: file.content,
  }))).slice(0, 3).flatMap((result, index) => {
    const node = nodesByPath.get(result.id);
    return node && !existingNodePaths.has(result.id) ? [{
      match: { type: 'node' as const, node: toNodeReportItem(node) },
      rank: 4,
      sortKey: String(index).padStart(10, '0'),
    }] : [];
  });
}

function fuzzySymbolMatches(
  data: GraphQueryData,
  pattern: string,
  existingMatches: readonly RankedMatch[],
): RankedMatch[] {
  if (existingMatches.length > 0) return [];
  return findFuzzySymbols(pattern, data.symbols ?? []).map(symbol => ({
    match: { type: 'symbol' as const, match: 'fuzzy' as const, symbol: symbolReportItem(symbol) },
    rank: 7,
    sortKey: `${symbol.filePath}\u0000${symbol.name}\u0000${symbol.id ?? ''}`,
  }));
}

export function searchGraph(
  data: GraphQueryData,
  config: GraphQuerySearchConfig,
): GraphQuerySearchReport {
  const matcher = createPatternMatcher(config.pattern);
  const directMatches = [
    ...(data.symbols ?? []).map(symbol => symbolMatch(symbol, matcher)).filter(match => match !== undefined),
    ...data.graphData.nodes.map(node => nodeMatch(node, matcher)).filter(match => match !== undefined),
    ...sourceMatches(data, config.pattern, matcher),
  ];
  const phraseMatches = phraseFallbackMatches(data, config.pattern, directMatches);
  const rankedMatches = [
    ...directMatches,
    ...phraseMatches,
    ...fuzzySymbolMatches(data, config.pattern, [...directMatches, ...phraseMatches]),
  ].sort((left, right) => left.rank - right.rank || left.sortKey.localeCompare(right.sortKey));
  const page = paginate(rankedMatches.map(item => item.match), config);

  return {
    pattern: config.pattern,
    matches: page.items,
    page: page.page,
    sources: {
      text: {
        freshness: 'live',
        filesScanned: data.sourceText?.filesScanned ?? 0,
        filesSkipped: data.sourceText?.filesSkipped ?? 0,
      },
      symbols: {
        freshness: 'cached',
        cacheState: data.cacheState ?? 'fresh',
      },
    },
  };
}
