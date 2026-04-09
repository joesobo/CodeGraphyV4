/**
 * @fileoverview Extends detection rule for GDScript.
 * Finds `extends "res://scripts/base.gd"` statements with file paths.
 * @module plugins/godot/sources/extends
 */

import * as path from 'path';
import type { IAnalysisRelation } from '@codegraphy-vscode/plugin-api';
import type { GDScriptRuleContext } from '../parser';
import { isResPath, normalizePath } from '../parser';

/** Detects extends statements with file paths: extends "res://scripts/base.gd" */
export function detect(content: string, filePath: string, ctx: GDScriptRuleContext): IAnalysisRelation[] {
  const relations: IAnalysisRelation[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const lineWithoutComment = lines[i].split('#')[0];
    if (!lineWithoutComment.trim()) continue;

    const match = lineWithoutComment.trim().match(/^extends\s+["']([^"']+)["']/);
    if (match) {
      const resPath = match[1];
      if (isResPath(resPath)) {
        const resolved = ctx.resolver.resolve(resPath, ctx.relativeFilePath);
        const resolvedPath = resolved ? normalizePath(path.join(ctx.workspaceRoot, resolved)) : null;
        relations.push({
          kind: 'inherit',
          specifier: resPath,
          resolvedPath,
          type: 'static',
          sourceId: 'extends',
          fromFilePath: filePath,
          toFilePath: resolvedPath,
        });
      }
    }
  }

  return relations;
}

class ExtendsRule {
    readonly id = 'extends';
    readonly detect = detect;
}

const rule = new ExtendsRule();
export default rule;
