import type { IGraphNode } from '../../graph/contracts';
import type { GraphQueryData } from '../data';

const MAX_QUERY_TERMS = 16;
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'during', 'for', 'from', 'in',
  'into', 'is', 'it', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'with',
]);

export interface TaskMapDocument {
  node: IGraphNode;
  pathText: string;
  sourceText: string;
}

export interface TaskMapLexicalRank {
  matchedTerms: string[];
  score: number;
}

function tokenize(value: string): string[] {
  const separated = value.replace(/([\p{Ll}\d])(\p{Lu})/gu, '$1 $2');
  return separated.match(/[\p{L}\d]+/gu)?.map(term => term.toLocaleLowerCase())
    .filter(term => term.length > 2 && !STOP_WORDS.has(term)) ?? [];
}

function addPresentParticipleRoot(roots: Set<string>, term: string): void {
  if (!term.endsWith('ing') || term.length <= 5) return;
  const root = term.slice(0, -3);
  roots.add(root);
  if (root.at(-1) === root.at(-2)) roots.add(root.slice(0, -1));
}

function termRoots(term: string): Set<string> {
  const roots = new Set([term]);
  addPresentParticipleRoot(roots, term);
  if (term.endsWith('ed') && term.length > 4) {
    roots.add(term.slice(0, -2));
    roots.add(term.slice(0, -1));
  }
  if (term.endsWith('s') && term.length > 4) roots.add(term.slice(0, -1));
  return roots;
}

function addInflectedVariants(variants: Set<string>, root: string): void {
  variants.add(`${root}s`);
  if (root.endsWith('e')) {
    variants.add(`${root}d`);
    variants.add(`${root.slice(0, -1)}ing`);
    return;
  }
  variants.add(`${root}ed`);
  variants.add(`${root}ing`);
  if (/[^aeiou]$/u.test(root)) {
    variants.add(`${root}${root.at(-1)}ed`);
    variants.add(`${root}${root.at(-1)}ing`);
  }
}

function termVariants(term: string): string[] {
  const roots = termRoots(term);
  const variants = new Set(roots);
  for (const root of roots) addInflectedVariants(variants, root);
  return [...variants];
}

function normalizeSearchText(value: string): string {
  const separated = value.replace(/([\p{Ll}\d])(\p{Lu})/gu, '$1 $2').toLocaleLowerCase();
  return ` ${separated.replace(/[^\p{L}\d]+/gu, ' ')} `;
}

function includesTerm(value: string, queryTerm: string): boolean {
  return termVariants(queryTerm).some(term => value.includes(` ${term} `));
}

export function createTaskMapDocuments(data: GraphQueryData): TaskMapDocument[] {
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

export function selectTaskMapTerms(query: string, documents: readonly TaskMapDocument[]): string[] {
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

export function taskMapTermFrequencies(
  terms: readonly string[],
  documents: readonly TaskMapDocument[],
): Map<string, number> {
  return new Map(terms.map(term => [
    term,
    documents.filter(document => includesTerm(document.pathText, term) || includesTerm(document.sourceText, term)).length,
  ]));
}

export function rankTaskMapDocument(
  document: TaskMapDocument,
  queryTerms: readonly string[],
  frequencies: ReadonlyMap<string, number>,
  documentCount: number,
): TaskMapLexicalRank {
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
