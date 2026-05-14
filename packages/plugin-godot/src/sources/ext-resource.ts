/**
 * @fileoverview Godot text-resource dependency detection.
 * Finds `[ext_resource ... path="res://..."]` entries in `.tscn` and `.tres` files.
 * @module plugins/godot/sources/ext-resource
 */

import type { IAnalysisRelation } from '@codegraphy/plugin-api';
import type { GDScriptRuleContext } from '../parser';
import { materializeResolvedPath } from '../resolved-path';
import { parseGodotTextResourceDocument } from '../textResource/parser';

export function detect(
  content: string,
  filePath: string,
  ctx: GDScriptRuleContext,
): IAnalysisRelation[] {
  const relations: IAnalysisRelation[] = [];
  const projectRoot = ctx.projectRoot ?? ctx.workspaceRoot;

  for (const tag of parseGodotTextResourceDocument(content).tags) {
    if (tag.name !== 'ext_resource' || !tag.fields.path) {
      continue;
    }

    const resolved = ctx.resolver.resolveTextResourcePath(
      tag.fields.path,
      ctx.relativeFilePath,
      tag.fields.uid,
    );
    const resolvedPath = resolved
      ? materializeResolvedPath({
          projectRoot,
          resolvedPath: resolved,
          workspaceRoot: ctx.workspaceRoot,
        })
      : null;
    relations.push({
      kind: 'load',
      specifier: tag.fields.path,
      resolvedPath,
      type: 'static',
      sourceId: 'ext-resource',
      fromFilePath: filePath,
      toFilePath: resolvedPath,
    });
  }

  return relations;
}

class ExtResourceRule {
  readonly id = 'ext-resource';
  readonly detect = detect;
}

const rule = new ExtResourceRule();
export default rule;
