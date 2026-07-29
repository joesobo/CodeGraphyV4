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

const DEFAULT_FILES = 8;
const MAX_FILES = 20;
const MAX_RELATIONSHIPS = 12;

type TaskMapDocument = ReturnType<typeof createTaskMapDocuments>[number];
type TaskMapLexicalRank = ReturnType<typeof rankTaskMapDocument>;

interface RankedTaskFile {
  file: GraphQueryTaskMapFile;
  lexicalScore: number;
  graphScore: number;
  score: number;
}

interface TaskMapRanking {
  connected: ReadonlySet<string>;
  graphRanks: ReadonlyMap<string, number>;
  lexical: ReadonlyMap<string, TaskMapLexicalRank>;
  maxGraphScore: number;
  maxLexicalScore: number;
  symbols: ReturnType<typeof indexTaskMapSymbols>;
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

function maximum(values: Iterable<number>, fallback: number): number {
  let result = fallback;
  for (const value of values) result = Math.max(result, value);
  return result;
}

function createTaskMapRanking(
  data: GraphQueryData,
  documents: readonly TaskMapDocument[],
  terms: readonly string[],
): TaskMapRanking {
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
  return {
    connected: connectedTaskMapFiles(lexical, links),
    graphRanks,
    lexical,
    maxGraphScore: maximum(graphRanks.values(), 1 / Math.max(documents.length, 1)),
    maxLexicalScore: maximum([...lexical.values()].map(rank => rank.score), 1),
    symbols: indexTaskMapSymbols(data),
  };
}

function rankTaskMapFile(
  document: TaskMapDocument,
  ranking: TaskMapRanking,
): RankedTaskFile | undefined {
  const lexicalRank = ranking.lexical.get(document.node.id) ?? { matchedTerms: [], score: 0 };
  if (lexicalRank.score <= 0 && !ranking.connected.has(document.node.id)) return undefined;
  const graphScore = ranking.graphRanks.get(document.node.id) ?? 0;
  return {
    file: {
      path: document.node.id,
      nodeType: 'file',
      matchedTerms: lexicalRank.matchedTerms,
      symbols: ranking.symbols.get(document.node.id) ?? [],
    },
    lexicalScore: lexicalRank.score,
    graphScore,
    score: lexicalRank.score / ranking.maxLexicalScore * 0.85
      + graphScore / ranking.maxGraphScore * 0.15,
  };
}

function compareRankedTaskFiles(left: RankedTaskFile, right: RankedTaskFile): number {
  return Number(right.lexicalScore > 0) - Number(left.lexicalScore > 0)
    || right.score - left.score
    || right.lexicalScore - left.lexicalScore
    || left.file.path.localeCompare(right.file.path);
}

function rankTaskMapFiles(
  data: GraphQueryData,
  documents: readonly TaskMapDocument[],
  terms: readonly string[],
): RankedTaskFile[] {
  const ranking = createTaskMapRanking(data, documents, terms);
  return documents
    .map(document => rankTaskMapFile(document, ranking))
    .filter((ranked): ranked is RankedTaskFile => Boolean(ranked))
    .sort(compareRankedTaskFiles);
}

export function mapGraphTask(
  data: GraphQueryData,
  config: GraphQueryTaskMapConfig,
): GraphQueryTaskMapReport {
  const query = typeof config.query === 'string' ? config.query : '';
  const documents = createTaskMapDocuments(data);
  const terms = selectTaskMapTerms(query, documents);
  const effectiveConfig = { ...config, limit: requestedFileLimit(config) };
  const ranked = rankTaskMapFiles(data, documents, terms);
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
