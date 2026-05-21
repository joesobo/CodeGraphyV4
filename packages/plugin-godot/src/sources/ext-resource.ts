/**
 * @fileoverview Godot text-resource dependency detection.
 * Finds `[ext_resource ... path="res://..."]` entries in `.tscn` and `.tres` files.
 * @module plugins/godot/sources/ext-resource
 */

import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import type { GDScriptRuleContext } from '../parser';
import { materializeResolvedPath } from '../resolved-path';
import { parseGodotTextResourceDocument } from '../textResource/parser';
import { parseGodotResourceAst } from '../textResource/resourceAst';

interface ExtResourceReference {
  path: string;
  uid?: string;
}

function readExtResourceReferences(content: string): ExtResourceReference[] {
  const ast = parseGodotResourceAst(content);
  if (ast) {
    return ast.extResources;
  }

  return parseGodotTextResourceDocument(content).tags
    .filter((tag) => tag.name === 'ext_resource' && tag.fields.path)
    .map((tag) => ({
      path: tag.fields.path,
      ...(tag.fields.uid ? { uid: tag.fields.uid } : {}),
    }));
}

export function detect(
  content: string,
  filePath: string,
  ctx: GDScriptRuleContext,
): IAnalysisRelation[] {
  const relations: IAnalysisRelation[] = [];
  const projectRoot = ctx.projectRoot ?? ctx.workspaceRoot;

  for (const resource of readExtResourceReferences(content)) {
    const resolved = ctx.resolver.resolveTextResourcePath(
      resource.path,
      ctx.relativeFilePath,
      resource.uid,
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
      specifier: resource.path,
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
