/**
 * @fileoverview Class name usage detection rule for GDScript.
 * Detects references to class names defined via `class_name` in other files.
 * Pattern matching logic is in class-name-detector.ts.
 * @module plugins/godot/sources/class-name-usage
 */

import * as path from 'path';
import type { IAnalysisRelation } from '@codegraphy-vscode/plugin-api';
import type { GDScriptRuleContext } from '../parser';
import { normalizePath } from '../parser';
import { detectUsagesInLine } from './class-name-detector';

export { detectUsagesInLine } from './class-name-detector';

const SOURCE_ID = 'class-name-usage';

/**
 * Detects class_name usage patterns in GDScript content.
 * Only identifiers starting with uppercase are considered, matching GDScript convention.
 * The resolver discards any name not in its class_name map.
 */
export function detect(content: string, filePath: string, ctx: GDScriptRuleContext): IAnalysisRelation[] {
  const relations: IAnalysisRelation[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const lineWithoutComment = lines[i].split('#')[0];

    const usages = detectUsagesInLine(lineWithoutComment);
    for (const ref of usages) {
      const resolved = ctx.resolver.resolve(ref.resPath, ctx.relativeFilePath);
      if (resolved) {
        const resolvedPath = normalizePath(path.join(ctx.workspaceRoot, resolved));
        relations.push({
          kind: 'reference',
          specifier: ref.resPath,
          resolvedPath,
          type: 'static',
          sourceId: SOURCE_ID,
          fromFilePath: filePath,
          toFilePath: resolvedPath,
        });
      }
    }
  }

  return relations;
}

class ClassNameUsageRule {
  readonly id = SOURCE_ID;
  readonly detect = detect;
}

const rule = new ClassNameUsageRule();
export default rule;
