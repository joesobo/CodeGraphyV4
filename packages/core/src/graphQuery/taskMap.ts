import type { GraphEdgeKind, IGraphNode } from '../graph/contracts';
import type { GraphQueryData } from './data';
import type {
  GraphQueryTaskMapConfig,
  GraphQueryTaskMapFile,
  GraphQueryTaskMapReport,
} from './model';
import { paginate } from './pagination';

const MAX_QUERY_TERMS = 16;
const MAX_SYMBOLS_PER_FILE = 3;
const MAX_RELATIONSHIPS = 12;
const PAGE_RANK_ITERATIONS = 20;
const PAGE_RANK_DAMPING = 0.85;
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'during', 'for', 'from', 'in',
  'into', 'is', 'it', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'with',
]);

interface TaskDocument {
  node: IGraphNode;
  pathText: string;
  sourceText: string;
}

interface RankedTaskFile {
  file: GraphQueryTaskMapFile;
  lexicalScore: number;
  graphScore: number;
}

function tokenize(value: string): string[] {
  const separated = value.replace(/([\p{Ll}\d])(\p{Lu})/gu, '$1 $2');
  return separated.match(/[\p{L}\d]+/gu)?.map(term => term.toLocaleLowerCase())
    .filter(term => term.length > 2 && !STOP_WORDS.has(term)) ?? [];
}

function termVariants(term: string): string[] {
  const variants = new Set([term]);
  if (term.endsWith('ing') && term.length > 5) variants.add(term.slice(0, -3));
  if (term.endsWith('ed') && term.length > 4) {
    variants.add(term.slice(0, -2));
    variants.add(term.slice(0, -1));
  }
  if (term.endsWith('s') && term.length > 4) variants.add(term.slice(0, -1));
  return [...variants];
}

function normalizeSearchText(value: string): string {
  const separated = value.replace(/([\p{Ll}\d])(\p{Lu})/gu, '$1 $2').toLocaleLowerCase();
  return ` ${separated.replace(/[^\p{L}\d]+/gu, ' ')} `;
}

function includesTerm(value: string, queryTerm: string): boolean {
  return termVariants(queryTerm).some(term => value.includes(` ${term} `));
}

function createDocuments(data: GraphQueryData): TaskDocument[] {
  const files = new Map(data.graphData.nodes
    .filter(node => node.nodeType === 'file' && !node.symbol)
    .map(node => [node.id, node]));
  return (data.sourceText?.files ?? []).flatMap(({ filePath, content }) => {
    const node = files.get(filePath);
    return node ? [{
      node,
      pathText: normalizeSearchText(filePath),
      sourceText: normalizeSearchText(content),
    }] : [];
  });
}

function selectTerms(query: string, documents: readonly TaskDocument[]): string[] {
  const candidates = [...new Set(tokenize(query))];
  const frequency = new Map(candidates.map(term => [
    term,
    documents.filter(document => includesTerm(document.pathText, term) || includesTerm(document.sourceText, term)).length,
  ]));
  return candidates
    .filter(term => (frequency.get(term) ?? 0) > 0)
    .map((term, index) => ({ term, index, frequency: frequency.get(term) ?? 0 }))
    .sort((left, right) => left.frequency - right.frequency || left.index - right.index)
    .slice(0, MAX_QUERY_TERMS)
    .sort((left, right) => left.index - right.index)
    .map(item => item.term);
}

function lexicalRank(
  document: TaskDocument,
  queryTerms: readonly string[],
  frequencies: ReadonlyMap<string, number>,
  documentCount: number,
): { matchedTerms: string[]; score: number } {
  const matchedTerms = queryTerms.filter(term => (
    includesTerm(document.pathText, term) || includesTerm(document.sourceText, term)
  ));
  const score = matchedTerms.reduce((total, term) => {
    const inverseFrequency = Math.log((documentCount + 1) / ((frequencies.get(term) ?? 0) + 1)) + 1;
    const pathMatch = includesTerm(document.pathText, term);
    const textMatch = includesTerm(document.sourceText, term);
    return total + inverseFrequency * (pathMatch ? 4 : textMatch ? 1 : 0);
  }, 0);
  const isTest = /(?:^|\/)(?:__tests__|tests?)(?:\/|\.)|\.(?:spec|test)\.[^/]+$/iu.test(document.node.id);
  return { matchedTerms, score: isTest ? score * 0.15 : score };
}

function filePathForNode(node: IGraphNode | undefined): string | undefined {
  if (!node) return undefined;
  if (node.nodeType === 'file' && !node.symbol) return node.id;
  return node.symbol?.filePath;
}

function edgeWeight(kind: GraphEdgeKind): number {
  if (kind === 'call' || kind === 'event' || kind === 'inherit' || kind === 'reference') return 3;
  if (kind === 'type-import') return 1;
  return 2;
}

function createFileLinks(data: GraphQueryData, filePaths: ReadonlySet<string>): Map<string, Map<string, number>> {
  const nodes = new Map(data.graphData.nodes.map(node => [node.id, node]));
  const links = new Map([...filePaths].map(filePath => [filePath, new Map<string, number>()]));
  for (const edge of data.graphData.edges) {
    if (edge.kind === 'contains') continue;
    const from = filePathForNode(nodes.get(edge.from));
    const to = filePathForNode(nodes.get(edge.to));
    if (!from || !to || from === to || !filePaths.has(from) || !filePaths.has(to)) continue;
    const weight = edgeWeight(edge.kind);
    const fromLinks = links.get(from);
    const toLinks = links.get(to);
    fromLinks?.set(to, (fromLinks.get(to) ?? 0) + weight);
    toLinks?.set(from, (toLinks.get(from) ?? 0) + weight);
  }
  return links;
}

function personalizedPageRank(
  links: ReadonlyMap<string, ReadonlyMap<string, number>>,
  personalization: ReadonlyMap<string, number>,
): Map<string, number> {
  const paths = [...links.keys()];
  const totalPersonalization = [...personalization.values()].reduce((total, value) => total + value, 0);
  const normalized = new Map<string, number>(paths.map(path => [
    path,
    totalPersonalization > 0 ? (personalization.get(path) ?? 0) / totalPersonalization : 1 / Math.max(paths.length, 1),
  ]));
  let ranks = new Map(normalized);
  for (let iteration = 0; iteration < PAGE_RANK_ITERATIONS; iteration += 1) {
    const next = new Map<string, number>(paths.map(path => [path, (1 - PAGE_RANK_DAMPING) * (normalized.get(path) ?? 0)]));
    for (const path of paths) {
      const neighbors = links.get(path) ?? new Map<string, number>();
      const totalWeight = [...neighbors.values()].reduce((total, weight) => total + weight, 0);
      if (totalWeight === 0) continue;
      for (const [neighbor, weight] of neighbors) {
        next.set(neighbor, (next.get(neighbor) ?? 0) + PAGE_RANK_DAMPING * (ranks.get(path) ?? 0) * weight / totalWeight);
      }
    }
    ranks = next;
  }
  return ranks;
}

function rankingGroup(filePath: string): string {
  const segments = filePath.split('/');
  const sourceIndex = segments.findIndex(segment => segment === 'src' || segment === 'tests');
  if (sourceIndex < 0) return segments.slice(0, Math.min(segments.length, 4)).join('/');
  const sourceArea = segments[sourceIndex + 1];
  const areaDepth = sourceArea === 'extension' || sourceArea === 'webview' ? 2 : 1;
  return segments.slice(0, sourceIndex + 1 + areaDepth).join('/');
}

function balanceSourceAreas(ranked: readonly RankedTaskFile[]): RankedTaskFile[] {
  const groups = new Map<string, RankedTaskFile[]>();
  for (const item of ranked) {
    const group = rankingGroup(item.file.path);
    groups.set(group, [...(groups.get(group) ?? []), item]);
  }
  const ordered = [...groups.entries()].sort((left, right) => {
    const leftRank = left[1][0];
    const rightRank = right[1][0];
    if (!leftRank || !rightRank) return left[0].localeCompare(right[0]);
    return Number(rightRank.lexicalScore > 0) - Number(leftRank.lexicalScore > 0)
      || rightRank.lexicalScore - leftRank.lexicalScore
      || rightRank.graphScore - leftRank.graphScore
      || left[0].localeCompare(right[0]);
  });
  const balanced: RankedTaskFile[] = [];
  for (let index = 0; balanced.length < ranked.length; index += 1) {
    for (const [, items] of ordered) {
      const item = items[index];
      if (item) balanced.push(item);
    }
  }
  return balanced;
}

function symbolsForFile(data: GraphQueryData, filePath: string): GraphQueryTaskMapFile['symbols'] {
  return (data.symbols ?? [])
    .filter(symbol => symbol.filePath === filePath)
    .sort((left, right) => left.name.localeCompare(right.name) || (left.id ?? '').localeCompare(right.id ?? ''))
    .slice(0, MAX_SYMBOLS_PER_FILE)
    .map(symbol => ({
      ...(symbol.id ? { id: symbol.id } : {}),
      name: symbol.name,
      ...(symbol.kind ? { kind: symbol.kind } : {}),
    }));
}

function selectedRelationships(
  data: GraphQueryData,
  selectedPaths: ReadonlySet<string>,
): { relationships: GraphQueryTaskMapReport['relationships']; complete: boolean } {
  const nodes = new Map(data.graphData.nodes.map(node => [node.id, node]));
  const grouped = new Map<string, Set<GraphEdgeKind>>();
  for (const edge of data.graphData.edges) {
    if (edge.kind === 'contains') continue;
    const from = filePathForNode(nodes.get(edge.from));
    const to = filePathForNode(nodes.get(edge.to));
    if (!from || !to || from === to || !selectedPaths.has(from) || !selectedPaths.has(to)) continue;
    const key = `${from}\u0000${to}`;
    const kinds = grouped.get(key) ?? new Set<GraphEdgeKind>();
    kinds.add(edge.kind);
    grouped.set(key, kinds);
  }
  const all = [...grouped].map(([key, kinds]) => {
    const [from = '', to = ''] = key.split('\u0000');
    return { from, to, edgeTypes: [...kinds].sort() };
  }).sort((left, right) => left.from.localeCompare(right.from) || left.to.localeCompare(right.to));
  return { relationships: all.slice(0, MAX_RELATIONSHIPS), complete: all.length <= MAX_RELATIONSHIPS };
}

export function mapGraphTask(
  data: GraphQueryData,
  config: GraphQueryTaskMapConfig,
): GraphQueryTaskMapReport {
  const documents = createDocuments(data);
  const terms = selectTerms(config.query, documents);
  const frequencies = new Map(terms.map(term => [
    term,
    documents.filter(document => includesTerm(document.pathText, term) || includesTerm(document.sourceText, term)).length,
  ]));
  const lexical = new Map(documents.map(document => [
    document.node.id,
    lexicalRank(document, terms, frequencies, documents.length),
  ]));
  const filePaths = new Set(documents.map(document => document.node.id));
  const links = createFileLinks(data, filePaths);
  const graphRanks = personalizedPageRank(
    links,
    new Map([...lexical].map(([path, rank]) => [path, rank.score])),
  );
  const connected = new Set<string>();
  for (const [path, rank] of lexical) {
    if (rank.score <= 0) continue;
    connected.add(path);
    for (const neighbor of links.get(path)?.keys() ?? []) connected.add(neighbor);
  }
  const ranked: RankedTaskFile[] = documents.flatMap((document) => {
    const lexicalRanked = lexical.get(document.node.id) ?? { matchedTerms: [], score: 0 };
    if (lexicalRanked.score <= 0 && !connected.has(document.node.id)) return [];
    return [{
      file: {
        path: document.node.id,
        nodeType: 'file' as const,
        matchedTerms: lexicalRanked.matchedTerms,
        symbols: symbolsForFile(data, document.node.id),
      },
      lexicalScore: lexicalRanked.score,
      graphScore: graphRanks.get(document.node.id) ?? 0,
    }];
  }).sort((left, right) => (
    Number(right.lexicalScore > 0) - Number(left.lexicalScore > 0)
    || right.lexicalScore - left.lexicalScore
    || right.graphScore - left.graphScore
    || left.file.path.localeCompare(right.file.path)
  ));
  const balanced = balanceSourceAreas(ranked);
  const page = paginate(balanced.map(item => item.file), config);
  const selectedPaths = new Set(page.items.map(file => file.path));
  const relationships = selectedRelationships(data, selectedPaths);

  return {
    query: config.query,
    terms,
    files: page.items,
    relationships: relationships.relationships,
    page: page.page,
    limits: {
      relationships: MAX_RELATIONSHIPS,
      complete: page.page.nextOffset === null && relationships.complete,
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
