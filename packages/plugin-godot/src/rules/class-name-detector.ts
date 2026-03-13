/**
 * @fileoverview Orchestrator for class_name usage detection in a single GDScript line.
 * Individual regex matchers are split across class-name-declarations and class-name-expressions.
 * @module plugins/godot/rules/class-name-detector
 */

import type { IGDScriptReference } from '../parser';
import { matchExtendsClass, matchTypeAnnotations, matchReturnType } from './class-name-declarations';
import { matchStaticAccess, matchIsAs, matchGenerics } from './class-name-expressions';

/**
 * Detect potential class_name usages in a single line.
 * Only identifiers starting with uppercase are considered, matching GDScript convention.
 * Deduplicates multiple references to the same class on the same line.
 */
export function detectUsagesInLine(line: string, lineNumber: number): IGDScriptReference[] {
	const references: IGDScriptReference[] = [];
	const seen = new Set<string>();

	const push = (name: string) => {
		if (!seen.has(name)) {
			seen.add(name);
			references.push({
				resPath: name,
				referenceType: 'class_name_usage',
				importType: 'static',
				line: lineNumber,
				isDeclaration: false,
			});
		}
	};

	const trimmed = line.trim();

	const extendsClass = matchExtendsClass(trimmed);
	if (extendsClass) push(extendsClass);

	for (const name of matchTypeAnnotations(line)) push(name);

	const returnType = matchReturnType(line);
	if (returnType) push(returnType);

	for (const name of matchStaticAccess(line)) push(name);
	for (const name of matchIsAs(line)) push(name);
	for (const name of matchGenerics(line)) push(name);

	return references;
}
