/**
 * @fileoverview Expression-side regex matchers for class_name usage patterns.
 * Handles: static access, is/as checks, generics.
 * @module plugins/godot/rules/class-name-expr-matchers
 */

/** Match static/constructor access: `ClassName.something` */
export function matchStaticAccess(line: string): string[] {
	const results: string[] = [];
	const regex = /\b([A-Z]\w*)\s*\./g;
	let mt;
	while ((mt = regex.exec(line)) !== null) results.push(mt[1]);
	return results;
}

/** Match type checks and casts: `x is ClassName`, `x as ClassName` */
export function matchIsAs(line: string): string[] {
	const results: string[] = [];
	const regex = /\b(?:is|as)\s+([A-Z]\w*)/g;
	let mt;
	while ((mt = regex.exec(line)) !== null) results.push(mt[1]);
	return results;
}

/** Match typed generics: `Array[ClassName]`, `Dictionary[K, V]` */
export function matchGenerics(line: string): string[] {
	const results: string[] = [];
	const regex = /\[([A-Z]\w*)(?:,\s*([A-Z]\w*))?\]/g;
	let mt;
	while ((mt = regex.exec(line)) !== null) {
		results.push(mt[1]);
		if (mt[2]) results.push(mt[2]);
	}
	return results;
}
