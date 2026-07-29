const PATH_TERM_WEIGHT = 100;
const PATH_FRAGMENT_WEIGHT = 20;

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'from',
  'how', 'in', 'into', 'is', 'it', 'of', 'on', 'or', 'that', 'the', 'this',
  'to', 'with',
]);

export interface SearchDocument {
  id: string;
  path: string;
  text: string;
}

export interface RankedSearchDocument {
  id: string;
  score: number;
}

function tokenize(value: string): string[] {
  const separated = value.replace(/([\p{Ll}\d])(\p{Lu})/gu, '$1 $2');
  return separated.match(/[\p{L}\d]+/gu)?.map(term => term.toLocaleLowerCase())
    .filter(term => term.length > 1 && !STOP_WORDS.has(term)) ?? [];
}

function scoreDocument(
  document: SearchDocument,
  queryTerms: readonly string[],
): RankedSearchDocument | undefined {
  const path = document.path.toLocaleLowerCase();
  const pathTerms = tokenize(document.path);
  const textTerms = tokenize(document.text);
  const availableTerms = new Set([...pathTerms, ...textTerms]);
  if (!queryTerms.every(term => availableTerms.has(term))) return undefined;
  const score = queryTerms.reduce((total, term) => (
    total
    + pathTerms.filter(pathTerm => pathTerm === term).length * PATH_TERM_WEIGHT
    + (path.includes(term) ? PATH_FRAGMENT_WEIGHT : 0)
    + Math.min(10, textTerms.filter(textTerm => textTerm === term).length)
  ), 0);
  return { id: document.id, score };
}

export function rankSearchDocuments(
  pattern: string,
  documents: readonly SearchDocument[],
): RankedSearchDocument[] {
  if (!/\s/u.test(pattern)) return [];
  const queryTerms = [...new Set(tokenize(pattern))];
  if (queryTerms.length < 2) return [];
  const ranked = documents.flatMap(document => scoreDocument(document, queryTerms) ?? []);
  const pathMatches = ranked.filter(result => {
    const document = documents.find(candidate => candidate.id === result.id);
    const pathTerms = new Set(tokenize(document?.path ?? ''));
    return queryTerms.every(term => pathTerms.has(term));
  });
  return (pathMatches.length > 0 ? pathMatches : ranked)
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
}
