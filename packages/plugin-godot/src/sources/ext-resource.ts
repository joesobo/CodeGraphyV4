/**
 * @fileoverview Godot text-resource dependency detection.
 * Finds `[ext_resource ... path="res://..."]` entries in `.tscn` and `.tres` files.
 * @module plugins/godot/sources/ext-resource
 */

import type { IAnalysisRelation } from '@codegraphy-vscode/plugin-api';
import type { GDScriptRuleContext } from '../parser';
import { materializeResolvedPath } from '../resolved-path';

const EXT_RESOURCE_TAG_REGEX = /^\[\s*ext_resource\b(.*)\]$/;
const TAG_FIELD_REGEX = /\b([A-Za-z_][A-Za-z0-9_]*)=(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|([^\s\]]+))/g;

interface ExtResourceTag {
  path: string;
  uid?: string;
}

function parseExtResourceTag(line: string): ExtResourceTag | null {
  const tagMatch = line.trim().match(EXT_RESOURCE_TAG_REGEX);
  if (!tagMatch) {
    return null;
  }

  const fields: Record<string, string> = {};
  TAG_FIELD_REGEX.lastIndex = 0;
  let fieldMatch;
  while ((fieldMatch = TAG_FIELD_REGEX.exec(tagMatch[1])) !== null) {
    fields[fieldMatch[1]] = fieldMatch[2] ?? fieldMatch[3] ?? fieldMatch[4] ?? '';
  }

  if (!fields.path) {
    return null;
  }

  return {
    path: fields.path,
    uid: fields.uid,
  };
}

export function detect(
  content: string,
  filePath: string,
  ctx: GDScriptRuleContext,
): IAnalysisRelation[] {
  const relations: IAnalysisRelation[] = [];
  const lines = content.split('\n');
  const projectRoot = ctx.projectRoot ?? ctx.workspaceRoot;

  for (const line of lines) {
    if (!line.trim() || line.trimStart().startsWith(';')) {
      continue;
    }

    const resource = parseExtResourceTag(line);
    if (!resource) {
      continue;
    }

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
