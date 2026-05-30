/**
 * @fileoverview Preload detection rule for GDScript.
 * Finds `preload("res://path/to/file.gd")` calls.
 * @module plugins/godot/sources/preload
 */

import type { IAnalysisRelationshipEvidence } from '@codegraphy-dev/plugin-api';
import type { GDScriptRuleContext } from '../parser';
import { parseGDScriptResourceReferences } from '../parser';
import { materializeResolvedPath } from '../resolved-path';

/** Detects preload() calls: preload("res://path/to/file.gd") */
export function detect(content: string, filePath: string, ctx: GDScriptRuleContext): IAnalysisRelationshipEvidence[] {
  const relations: IAnalysisRelationshipEvidence[] = [];
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
      edgeType: 'load',
      timing: 'static',
      sourceId: 'preload',
      specifier: reference.resPath,
      from: { kind: 'file', filePath },
      target: resolvedPath
        ? { kind: 'file', path: resolvedPath, pathKind: 'absolute', specifier: reference.resPath }
        : { kind: 'unresolved', specifier: reference.resPath },
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
