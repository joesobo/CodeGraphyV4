/**
 * @fileoverview Preload detection rule for GDScript.
 * Finds `preload("res://path/to/file.gd")` calls.
 * @module plugins/godot/sources/preload
 */

import * as path from 'path';
import type { IConnection, IConnectionDetector } from '@codegraphy-vscode/plugin-api';
import type { GDScriptRuleContext } from '../parser';
import { isResPath, normalizePath } from '../parser';

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
          kind: 'load',
          specifier: resPath,
          resolvedPath: resolved ? normalizePath(path.join(ctx.workspaceRoot, resolved)) : null,
          type: 'static',
          sourceId: 'preload',
        });
      }
    }
  }

  return connections;
}

const rule: IConnectionDetector<GDScriptRuleContext> = { id: 'preload', detect };
export default rule;
