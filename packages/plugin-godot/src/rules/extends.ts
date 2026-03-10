/**
 * @fileoverview Extends detection rule for GDScript.
 * Finds `extends "res://scripts/base.gd"` statements with file paths.
 * @module plugins/godot/rules/extends
 */

import * as path from 'path';
import type { IConnection, IRuleDetector } from '@codegraphy/plugin-api';
import type { GDScriptRuleContext } from '../parser';
import { isResPath } from '../parser';

/** Detects extends statements with file paths: extends "res://scripts/base.gd" */
export function detect(content: string, _filePath: string, ctx: GDScriptRuleContext): IConnection[] {
  const connections: IConnection[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('#')) continue;
    const lineWithoutComment = lines[i].split('#')[0];

    const match = lineWithoutComment.trim().match(/^extends\s+["']([^"']+)["']/);
    if (match) {
      const resPath = match[1];
      if (isResPath(resPath)) {
        const resolved = ctx.resolver.resolve(resPath, ctx.relativeFilePath);
        connections.push({
          specifier: resPath,
          resolvedPath: resolved ? path.join(ctx.workspaceRoot, resolved).replace(/\\/g, '/') : null,
          type: 'static',
          ruleId: 'extends',
        });
      }
    }
  }

  return connections;
}

const rule: IRuleDetector<GDScriptRuleContext> = { id: 'extends', detect };
export default rule;
