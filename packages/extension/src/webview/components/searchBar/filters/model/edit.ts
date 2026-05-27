import { normalizeFilterPattern } from './normalization';

export function addFilterPatterns(
	currentPatterns: readonly string[],
	nextPatterns: readonly string[],
): string[] {
	const normalized = nextPatterns
		.map(normalizeFilterPattern)
		.filter(Boolean);

	return Array.from(new Set([...currentPatterns, ...normalized]));
}

export function filterPatternsEqual(
	left: readonly string[],
	right: readonly string[],
): boolean {
	return left.length === right.length && left.every((entry, index) => entry === right[index]);
}

export function removeFilterPattern(
	currentPatterns: readonly string[],
	pattern: string,
): string[] {
	return currentPatterns.filter((entry) => entry !== pattern);
}

export function editFilterPattern(
	currentPatterns: readonly string[],
	previousPattern: string,
	nextPattern: string,
): string[] {
	const normalizedPattern = normalizeFilterPattern(nextPattern);
	return shouldKeepExistingPattern(normalizedPattern)
		? [...currentPatterns]
		: replaceFilterPattern(currentPatterns, previousPattern, normalizedPattern);
}

function shouldKeepExistingPattern(
	nextPattern: string,
): boolean {
	return !nextPattern;
}

function replaceFilterPattern(
	currentPatterns: readonly string[],
	previousPattern: string,
	nextPattern: string,
): string[] {
	return currentPatterns.map((entry) => (entry === previousPattern ? nextPattern : entry));
}
