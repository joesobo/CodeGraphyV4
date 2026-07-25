import type { IGraphNode } from '../graph/contracts';
import type { GraphQueryData } from './data';
import type {
  GraphQueryTriageConfig,
  GraphQueryTriageFile,
  GraphQueryTriageReport,
} from './model';
import { toNodeReportItem } from './nodeReport';
import { paginate } from './pagination';

const MAX_QUERY_TERMS = 12;
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'into',
  'is', 'it', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'with',
]);

interface TriageDocument {
  node: IGraphNode;
  pathTerms: readonly string[];
  textTerms: readonly string[];
}

interface RankedTriageFile {
  file: GraphQueryTriageFile;
  score: number;
}

function tokenize(value: string): string[] {
  const separated = value.replace(/([\p{Ll}\d])(\p{Lu})/gu, '$1 $2');
  return separated.match(/[\p{L}\d]+/gu)?.map(term => term.toLocaleLowerCase())
    .filter(term => term.length > 2 && !STOP_WORDS.has(term)) ?? [];
}

function createDocuments(data: GraphQueryData): TriageDocument[] {
  const nodesByPath = new Map(data.graphData.nodes
    .filter(node => node.nodeType === 'file' && !node.symbol)
    .map(node => [node.id, node]));
  return (data.sourceText?.files ?? []).flatMap(({ filePath, content }) => {
    const node = nodesByPath.get(filePath);
    return node ? [{ node, pathTerms: tokenize(filePath), textTerms: tokenize(content) }] : [];
  });
}

function selectQueryTerms(query: string, documents: readonly TriageDocument[]): string[] {
  const candidates = [...new Set(tokenize(query))];
  const documentFrequency = new Map(candidates.map(term => [
    term,
    documents.filter(document => (
      document.pathTerms.includes(term) || document.textTerms.includes(term)
    )).length,
  ]));
  return candidates
    .filter(term => (documentFrequency.get(term) ?? 0) > 0)
    .map((term, index) => ({
      term,
      index,
      frequency: documentFrequency.get(term) ?? 0,
    }))
    .sort((left, right) => left.frequency - right.frequency || left.index - right.index)
    .slice(0, MAX_QUERY_TERMS)
    .sort((left, right) => left.index - right.index)
    .map(item => item.term);
}

function countTerms(terms: readonly string[], target: string): number {
  let count = 0;
  for (const term of terms) if (term === target) count += 1;
  return count;
}

function rankingGroup(filePath: string): string {
  const segments = filePath.split('/');
  const sourceIndex = segments.findIndex(segment => segment === 'src' || segment === 'tests');
  const end = sourceIndex >= 0 ? sourceIndex + 2 : Math.min(segments.length, 3);
  return segments.slice(0, end).join('/');
}

function balanceRankedFiles(ranked: readonly RankedTriageFile[]): RankedTriageFile[] {
  const groups = new Map<string, RankedTriageFile[]>();
  for (const item of ranked) {
    const group = rankingGroup(item.file.path);
    groups.set(group, [...(groups.get(group) ?? []), item]);
  }
  const orderedGroups = [...groups.entries()].sort((left, right) => (
    (right[1][0]?.score ?? 0) - (left[1][0]?.score ?? 0)
    || left[0].localeCompare(right[0])
  ));
  const balanced: RankedTriageFile[] = [];
  for (let index = 0; balanced.length < ranked.length; index += 1) {
    for (const [, items] of orderedGroups) {
      const item = items[index];
      if (item) balanced.push(item);
    }
  }
  return balanced;
}

function rankDocument(
  document: TriageDocument,
  queryTerms: readonly string[],
  documentCount: number,
  frequencies: ReadonlyMap<string, number>,
  degree: number,
): RankedTriageFile | undefined {
  const matchedTerms = queryTerms.filter(term => (
    document.pathTerms.includes(term) || document.textTerms.includes(term)
  ));
  if (matchedTerms.length === 0) return undefined;
  const lexicalScore = matchedTerms.reduce((total, term) => {
    const inverseFrequency = Math.log((documentCount + 1) / ((frequencies.get(term) ?? 0) + 1)) + 1;
    const pathCount = countTerms(document.pathTerms, term);
    const textCount = countTerms(document.textTerms, term);
    return total + inverseFrequency * (pathCount * 20 + Math.min(textCount, 10));
  }, 0);
  const testPenalty = /(?:^|\/)(?:__tests__|tests?)(?:\/|\.)|\.(?:spec|test)\.[^/]+$/iu.test(document.node.id)
    ? 12
    : 0;
  const score = lexicalScore + Math.log2(degree + 1) * 15 - testPenalty;
  return {
    file: { ...toNodeReportItem(document.node), matchedTerms },
    score,
  };
}

export function triageGraph(
  data: GraphQueryData,
  config: GraphQueryTriageConfig,
): GraphQueryTriageReport {
  const documents = createDocuments(data);
  const terms = selectQueryTerms(config.query, documents);
  const frequencies = new Map(terms.map(term => [
    term,
    documents.filter(document => (
      document.pathTerms.includes(term) || document.textTerms.includes(term)
    )).length,
  ]));
  const degrees = new Map(documents.map(document => [document.node.id, 0]));
  for (const edge of data.graphData.edges) {
    if (edge.kind === 'contains') continue;
    if (degrees.has(edge.from)) degrees.set(edge.from, (degrees.get(edge.from) ?? 0) + 1);
    if (degrees.has(edge.to)) degrees.set(edge.to, (degrees.get(edge.to) ?? 0) + 1);
  }
  const ranked = documents
    .flatMap(document => rankDocument(
      document,
      terms,
      documents.length,
      frequencies,
      degrees.get(document.node.id) ?? 0,
    ) ?? [])
    .sort((left, right) => (
      right.score - left.score
      || right.file.matchedTerms.length - left.file.matchedTerms.length
      || left.file.path.localeCompare(right.file.path)
    ));
  const balanced = balanceRankedFiles(ranked);
  const page = paginate(balanced.map(item => item.file), config);

  return {
    query: config.query,
    terms,
    files: page.items,
    page: page.page,
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
