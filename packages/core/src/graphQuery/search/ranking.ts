const BM25_K1 = 1.2;
const BM25_B = 0.75;
const PATH_TERM_WEIGHT = 8;

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

function countTerms(terms: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const term of terms) counts.set(term, (counts.get(term) ?? 0) + 1);
  return counts;
}

export function rankSearchDocuments(
  pattern: string,
  documents: readonly SearchDocument[],
): RankedSearchDocument[] {
  if (!/\s/u.test(pattern)) return [];
  const queryTerms = [...new Set(tokenize(pattern))];
  if (queryTerms.length < 2 || documents.length === 0) return [];

  const prepared = documents.map((document) => {
    const pathTerms = tokenize(document.path);
    const terms = [...pathTerms.flatMap(term => Array<string>(PATH_TERM_WEIGHT).fill(term)), ...tokenize(document.text)];
    return { document, terms, counts: countTerms(terms) };
  });
  const averageLength = prepared.reduce((total, item) => total + item.terms.length, 0) / prepared.length;
  const documentFrequency = new Map(queryTerms.map(term => [
    term,
    prepared.filter(item => item.counts.has(term)).length,
  ]));

  return prepared.flatMap(({ document, terms, counts }) => {
    const score = queryTerms.reduce((total, term) => {
      const frequency = counts.get(term) ?? 0;
      if (frequency === 0) return total;
      const frequencyInDocuments = documentFrequency.get(term) ?? 0;
      const inverseDocumentFrequency = Math.log(
        1 + (documents.length - frequencyInDocuments + 0.5) / (frequencyInDocuments + 0.5),
      );
      const normalizedFrequency = frequency + BM25_K1 * (
        1 - BM25_B + BM25_B * terms.length / averageLength
      );
      return total + inverseDocumentFrequency * frequency * (BM25_K1 + 1) / normalizedFrequency;
    }, 0);
    return score > 0 ? [{ id: document.id, score }] : [];
  }).sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
}
