/**
 * @fileoverview Declaration-side regex matchers for class_name usage patterns.
 * Handles: extends, type annotations, return types.
 * @module plugins/godot/sources/class-name-declarations
 */

/** Match `extends ClassName` (unquoted, class_name-based inheritance) */
export function matchExtendsClass(trimmedLine: string): string | null {
	const mt = trimmedLine.match(/^extends\s+([A-Z]\w*)\s*(?:#.*)?$/);
	return mt ? mt[1] : null;
}

/** Match type annotations: `var x: ClassName`, `func f(p: ClassName)` */
export function matchTypeAnnotations(line: string): string[] {
	const results: string[] = [];
	const regex = /\w+\s*:\s*([A-Z]\w*)/g;
	let mt;
	while ((mt = regex.exec(line)) !== null) results.push(mt[1]);
	return results;
}

/** Match return type: `-> ClassName` */
export function matchReturnType(line: string): string | null {
	const mt = line.match(/->\s*([A-Z]\w*)/);
	return mt ? mt[1] : null;
}
