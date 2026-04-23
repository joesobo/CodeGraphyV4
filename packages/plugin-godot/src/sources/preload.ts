/**
 * @fileoverview Preload detection rule for GDScript.
 * Finds `preload("res://path/to/file.gd")` calls.
 * @module plugins/godot/sources/preload
 */

import type { IAnalysisRelation } from '@codegraphy-vscode/plugin-api';
import type { GDScriptRuleContext } from '../parser';
import { isResPath } from '../parser';
import { materializeResolvedPath } from '../resolved-path';

/** Detects preload() calls: preload("res://path/to/file.gd") */
export function detect(content: string, filePath: string, ctx: GDScriptRuleContext): IAnalysisRelation[] {
  const relations: IAnalysisRelation[] = [];
  const lines = content.split('\n');
  const regex = /preload\s*\(\s*["']([^"']+)["']\s*\)/g;
  const projectRoot = ctx.projectRoot ?? ctx.workspaceRoot;

  for (let i = 0; i < lines.length; i++) {
    const lineWithoutComment = lines[i].split('#')[0];
    if (!lineWithoutComment.trim()) continue;

    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(lineWithoutComment)) !== null) {
      const resPath = match[1];
      if (isResPath(resPath)) {
        const resolved = ctx.resolver.resolve(resPath, ctx.relativeFilePath);
        const resolvedPath = resolved
          ? materializeResolvedPath({
              projectRoot,
              resolvedPath: resolved,
              workspaceRoot: ctx.workspaceRoot,
            })
          : null;
        relations.push({
          kind: 'load',
          specifier: resPath,
          resolvedPath,
          type: 'static',
          sourceId: 'preload',
          fromFilePath: filePath,
          toFilePath: resolvedPath,
        });
      }
    }
  }

  return relations;
}

class PreloadRule {
    readonly id = 'preload';
    readonly detect = detect;
}

const rule = new PreloadRule();
export default rule;
