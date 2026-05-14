/**
 * @fileoverview Preload detection rule for GDScript.
 * Finds `preload("res://path/to/file.gd")` calls.
 * @module plugins/godot/sources/preload
 */

import type { IAnalysisRelation } from '@codegraphy/plugin-api';
import type { GDScriptRuleContext } from '../parser';
import { parseGDScriptResourceReferences } from '../parser';
import { materializeResolvedPath } from '../resolved-path';

/** Detects preload() calls: preload("res://path/to/file.gd") */
export function detect(content: string, filePath: string, ctx: GDScriptRuleContext): IAnalysisRelation[] {
  const relations: IAnalysisRelation[] = [];
  const projectRoot = ctx.projectRoot ?? ctx.workspaceRoot;

  for (const reference of parseGDScriptResourceReferences(content)) {
    if (reference.referenceType !== 'preload') {
      continue;
    }

    const resolved = ctx.resolver.resolve(reference.resPath, ctx.relativeFilePath);
    const resolvedPath = resolved
      ? materializeResolvedPath({
          projectRoot,
          resolvedPath: resolved,
          workspaceRoot: ctx.workspaceRoot,
        })
      : null;
    relations.push({
      kind: 'load',
      specifier: reference.resPath,
      resolvedPath,
      type: 'static',
      sourceId: 'preload',
      fromFilePath: filePath,
      toFilePath: resolvedPath,
    });
  }

  return relations;
}

class PreloadRule {
    readonly id = 'preload';
    readonly detect = detect;
}

const rule = new PreloadRule();
export default rule;
