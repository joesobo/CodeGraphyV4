import type { GraphQueryData } from './data';
import type {
  GraphQueryTaskMapConfig,
  GraphQueryTaskMapFile,
  GraphQueryTaskMapReport,
} from './model';
import { paginate } from './pagination';
import {
  createTaskMapDocuments,
  rankTaskMapDocument,
  selectTaskMapTerms,
  taskMapTermFrequencies,
} from './taskMap/lexical';
import { rankTaskMapGraph } from './taskMap/pagerank';
import {
  createTaskMapFileLinks,
  indexTaskMapSymbols,
  selectTaskMapRelationships,
} from './taskMap/projection';
import { balanceTaskMapSourceAreas } from './taskMap/sourceAreas';

const DEFAULT_FILES = 6;
const MAX_FILES = 20;
const MAX_RELATIONSHIPS = 8;

interface RankedTaskFile {
  file: GraphQueryTaskMapFile;
  lexicalScore: number;
  graphScore: number;
  score: number;
}

function requestedFileLimit(config: GraphQueryTaskMapConfig): number {
  if (!Number.isSafeInteger(config.limit) || (config.limit ?? 0) <= 0) return DEFAULT_FILES;
  return Math.min(config.limit ?? DEFAULT_FILES, MAX_FILES);
}

function connectedTaskMapFiles(
  lexical: ReadonlyMap<string, { score: number }>,
  links: ReadonlyMap<string, ReadonlyMap<string, number>>,
): Set<string> {
  const connected = new Set<string>();
  for (const [path, rank] of lexical) {
    if (rank.score <= 0) continue;
    connected.add(path);
    for (const neighbor of links.get(path)?.keys() ?? []) connected.add(neighbor);
  }
  return connected;
}

export function mapGraphTask(
  data: GraphQueryData,
  config: GraphQueryTaskMapConfig,
): GraphQueryTaskMapReport {
  const query = typeof config.query === 'string' ? config.query : '';
  const documents = createTaskMapDocuments(data);
  const terms = selectTaskMapTerms(query, documents);
  const frequencies = taskMapTermFrequencies(terms, documents);
  const lexical = new Map(documents.map(document => [
    document.node.id,
    rankTaskMapDocument(document, terms, frequencies, documents.length),
  ]));
  const filePaths = new Set(documents.map(document => document.node.id));
  const links = createTaskMapFileLinks(data, filePaths);
  const graphRanks = rankTaskMapGraph(
    links,
    new Map([...lexical].map(([path, rank]) => [path, rank.score])),
  );
  const connected = connectedTaskMapFiles(lexical, links);
  const maxLexicalScore = [...lexical.values()]
    .reduce((maximum, rank) => Math.max(maximum, rank.score), 1);
  const maxGraphScore = [...graphRanks.values()]
    .reduce((maximum, rank) => Math.max(maximum, rank), 1 / Math.max(documents.length, 1));
  const symbols = indexTaskMapSymbols(data);
  const ranked: RankedTaskFile[] = documents.flatMap((document) => {
    const lexicalRanked = lexical.get(document.node.id) ?? { matchedTerms: [], score: 0 };
    if (lexicalRanked.score <= 0 && !connected.has(document.node.id)) return [];
    const graphScore = graphRanks.get(document.node.id) ?? 0;
    return [{
      file: {
        path: document.node.id,
        nodeType: 'file' as const,
        matchedTerms: lexicalRanked.matchedTerms,
        symbols: symbols.get(document.node.id) ?? [],
      },
      lexicalScore: lexicalRanked.score,
      graphScore,
      score: lexicalRanked.score / maxLexicalScore * 0.85 + graphScore / maxGraphScore * 0.15,
    }];
  }).sort((left, right) => (
    Number(right.lexicalScore > 0) - Number(left.lexicalScore > 0)
    || right.score - left.score
    || right.lexicalScore - left.lexicalScore
    || left.file.path.localeCompare(right.file.path)
  ));
  const effectiveConfig = { ...config, limit: requestedFileLimit(config) };
  const balanced = balanceTaskMapSourceAreas(ranked);
  const page = paginate(balanced.map(item => item.file), effectiveConfig);
  const relationships = selectTaskMapRelationships(
    data,
    new Set(page.items.map(file => file.path)),
    MAX_RELATIONSHIPS,
  );

  return {
    query,
    terms,
    files: page.items,
    relationships: relationships.relationships,
    page: page.page,
    limits: {
      relationships: MAX_RELATIONSHIPS,
      complete: page.page.offset === 0 && page.page.nextOffset === null && relationships.complete,
    },
    sources: {
      text: {
        freshness: 'live',
        filesScanned: data.sourceText?.filesScanned ?? 0,
        filesSkipped: data.sourceText?.filesSkipped ?? 0,
      },
      graph: {
        freshness: 'cached',
        cacheState: data.cacheState ?? 'fresh',
      },
    },
  };
}
