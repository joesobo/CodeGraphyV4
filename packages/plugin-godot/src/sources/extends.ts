/**
 * @fileoverview Extends detection rule for GDScript.
 * Finds `extends "res://scripts/base.gd"` statements with file paths.
 * @module plugins/godot/sources/extends
 */

import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import type { GDScriptRuleContext } from '../parser';
import { parseGDScriptResourceReferences } from '../parser';
import { materializeResolvedPath } from '../resolved-path';

/** Detects extends statements with file paths: extends "res://scripts/base.gd" */
export function detect(content: string, filePath: string, ctx: GDScriptRuleContext): IAnalysisRelation[] {
  const relations: IAnalysisRelation[] = [];
  const projectRoot = ctx.projectRoot ?? ctx.workspaceRoot;

  for (const reference of parseGDScriptResourceReferences(content)) {
    if (reference.referenceType !== 'extends') {
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
      kind: 'inherit',
      specifier: reference.resPath,
      resolvedPath,
      type: 'static',
      sourceId: 'extends',
      fromFilePath: filePath,
      toFilePath: resolvedPath,
    });
  }

  return relations;
}

class ExtendsRule {
    readonly id = 'extends';
    readonly detect = detect;
}

const rule = new ExtendsRule();
export default rule;
