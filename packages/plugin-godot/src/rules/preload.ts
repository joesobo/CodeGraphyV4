/**
 * @fileoverview Preload detection rule for GDScript.
 * Finds `preload("res://path/to/file.gd")` calls.
 * @module plugins/godot/rules/preload
 */

import * as path from 'path';
import type { IConnection, IRuleDetector } from '@codegraphy/plugin-api';
import type { GDScriptRuleContext } from '../parser';
import { isResPath } from '../parser';

/** Detects preload() calls: preload("res://path/to/file.gd") */
export function detect(content: string, _filePath: string, ctx: GDScriptRuleContext): IConnection[] {
  const connections: IConnection[] = [];
  const lines = content.split('\n');
  const regex = /preload\s*\(\s*["']([^"']+)["']\s*\)/g;

  for (let i = 0; i < lines.length; i++) {
    const lineWithoutComment = lines[i].split('#')[0];
    if (!lineWithoutComment.trim()) continue;

    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(lineWithoutComment)) !== null) {
      const resPath = match[1];
      if (isResPath(resPath)) {
        const resolved = ctx.resolver.resolve(resPath, ctx.relativeFilePath);
        connections.push({
          specifier: resPath,
          resolvedPath: resolved ? path.join(ctx.workspaceRoot, resolved).replace(/\\/g, '/') : null,
          type: 'static',
          ruleId: 'preload',
        });
      }
    }
  }

  return connections;
}

const rule: IRuleDetector<GDScriptRuleContext> = { id: 'preload', detect };
export default rule;
