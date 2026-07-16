/**
 * @fileoverview Orchestrator for class_name usage detection in a single GDScript line.
 * Individual regex matchers are split across class-name-declarations and class-name-expressions.
 * @module plugins/godot/sources/class-name-detector
 */

import type { IGDScriptReference } from '../parser';
import { matchExtendsClass, matchTypeAnnotations, matchReturnType } from './class-name-declarations';
import { matchStaticAccess, matchStaticCall, matchIsAs, matchGenerics } from './class-name-expressions';

/**
 * Detect potential class_name usages in a single line.
 * Only identifiers starting with uppercase are considered, matching GDScript convention.
 * Deduplicates multiple references to the same class on the same line.
 */
export function detectUsagesInLine(line: string, lineNumber = 0): IGDScriptReference[] {
	const references: IGDScriptReference[] = [];
	const seen = new Set<string>();

	const push = (name: string, referenceType: IGDScriptReference['referenceType'] = 'class_name_usage') => {
		if (!seen.has(name)) {
			seen.add(name);
			references.push({
				resPath: name,
				referenceType,
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
	for (const name of matchStaticCall(line)) push(name, 'class_name_static_call');
	for (const matcher of [matchStaticAccess, matchIsAs, matchGenerics]) {
		for (const name of matcher(line)) push(name);
	}

	return references;
}
