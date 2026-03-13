/**
 * @fileoverview Class name usage detection rule for GDScript.
 * Detects references to class names defined via `class_name` in other files.
 * Pattern matching logic is in class-name-patterns.ts.
 * @module plugins/godot/rules/class-name-usage
 */

import * as path from 'path';
import type { IConnection, IRuleDetector } from '@codegraphy/plugin-api';
import type { GDScriptRuleContext } from '../parser';
import { detectUsagesInLine } from './class-name-patterns';

export { detectUsagesInLine } from './class-name-patterns';

/**
 * Detects class_name usage patterns in GDScript content.
 * Only identifiers starting with uppercase are considered, matching GDScript convention.
 * The resolver discards any name not in its class_name map.
 */
export function detect(content: string, _filePath: string, ctx: GDScriptRuleContext): IConnection[] {
	const connections: IConnection[] = [];
	const lines = content.split('\n');

	for (let i = 0; i < lines.length; i++) {
		const lineWithoutComment = lines[i].split('#')[0];
		if (!lineWithoutComment.trim()) continue;

		const usages = detectUsagesInLine(lineWithoutComment, i + 1);
		for (const ref of usages) {
			const resolved = ctx.resolver.resolve(ref.resPath, ctx.relativeFilePath);
			if (resolved) {
				connections.push({
					specifier: ref.resPath,
					resolvedPath: path.join(ctx.workspaceRoot, resolved).replace(/\\/g, '/'),
					type: 'static',
					ruleId: 'class-name-usage',
				});
			}
		}
	}

	return connections;
}

const rule: IRuleDetector<GDScriptRuleContext> = { id: 'class-name-usage', detect };
export default rule;
