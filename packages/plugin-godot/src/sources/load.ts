/**
 * @fileoverview Load detection rule for GDScript.
 * Finds `load("res://...")` and `ResourceLoader.load("res://...")` calls.
 * @module plugins/godot/sources/load
 */

import type { IAnalysisRelationshipEvidence } from '@codegraphy-dev/plugin-api';
import type { GDScriptRuleContext } from '../parser';
import { parseGDScriptResourceReferences } from '../parser';
import { materializeResolvedPath } from '../resolved-path';

/** Detects load() calls: load("res://..."), ResourceLoader.load("res://...") */
export function detect(content: string, filePath: string, ctx: GDScriptRuleContext): IAnalysisRelationshipEvidence[] {
  const relations: IAnalysisRelationshipEvidence[] = [];
  const projectRoot = ctx.projectRoot ?? ctx.workspaceRoot;

  for (const reference of parseGDScriptResourceReferences(content)) {
    if (reference.referenceType !== 'load') {
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
      timing: 'dynamic',
      sourceId: 'load',
      specifier: reference.resPath,
      from: { kind: 'file', filePath },
      target: resolvedPath
        ? { kind: 'file', path: resolvedPath, pathKind: 'absolute', specifier: reference.resPath }
        : { kind: 'unresolved', specifier: reference.resPath },
    });
  }

  return relations;
}

class LoadRule {
    readonly id = 'load';
    readonly detect = detect;
}

const rule = new LoadRule();
export default rule;
