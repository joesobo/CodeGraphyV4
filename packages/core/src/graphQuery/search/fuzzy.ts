import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';

const MIN_IDENTIFIER_LENGTH = 6;
const MAX_SUGGESTIONS = 3;

function identifierTerms(value: string): string[] {
  const separated = value.replace(/([\p{Ll}\d])(\p{Lu})/gu, '$1 $2');
  return separated.match(/[\p{L}\d]+/gu)?.map(term => term.toLocaleLowerCase()) ?? [];
}

function editDistance(left: string, right: string, maximum: number): number {
  if (Math.abs(left.length - right.length) > maximum) return maximum + 1;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    let rowMinimum = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitution = previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1);
      const distance = Math.min(
        previous[rightIndex] + 1,
        current[rightIndex - 1] + 1,
        substitution,
      );
      current.push(distance);
      rowMinimum = Math.min(rowMinimum, distance);
    }
    if (rowMinimum > maximum) return maximum + 1;
    previous = current;
  }
  return previous[right.length] ?? maximum + 1;
}

function tokenSimilarity(left: readonly string[], right: readonly string[]): number {
  const leftTerms = new Set(left);
  const rightTerms = new Set(right);
  const shared = [...leftTerms].filter(term => rightTerms.has(term)).length;
  if (shared < 2) return 0;
  return shared / new Set([...leftTerms, ...rightTerms]).size;
}

function fuzzyScore(pattern: string, symbolName: string): number | undefined {
  const normalizedPattern = pattern.toLocaleLowerCase();
  const normalizedName = symbolName.toLocaleLowerCase();
  const maximumDistance = Math.max(normalizedPattern.length, normalizedName.length) >= 10 ? 2 : 1;
  const distance = editDistance(normalizedPattern, normalizedName, maximumDistance);
  if (distance <= maximumDistance) {
    return 2 + (1 - distance / Math.max(normalizedPattern.length, normalizedName.length));
  }
  const similarity = tokenSimilarity(identifierTerms(pattern), identifierTerms(symbolName));
  return similarity >= 0.5 ? similarity : undefined;
}

export function findFuzzySymbols(
  pattern: string,
  symbols: readonly IAnalysisSymbol[],
  limit = MAX_SUGGESTIONS,
): IAnalysisSymbol[] {
  if (pattern.length < MIN_IDENTIFIER_LENGTH || pattern.includes('*') || /\s/u.test(pattern)) return [];
  return symbols.flatMap((symbol) => {
    const score = fuzzyScore(pattern, symbol.name);
    return score === undefined ? [] : [{ symbol, score }];
  }).sort((left, right) => (
    right.score - left.score
    || left.symbol.name.localeCompare(right.symbol.name)
    || left.symbol.filePath.localeCompare(right.symbol.filePath)
    || (left.symbol.id ?? '').localeCompare(right.symbol.id ?? '')
  )).slice(0, limit).map(item => item.symbol);
}
