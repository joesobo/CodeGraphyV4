/**
 * @fileoverview Load detection rule for GDScript.
 * Finds `load("res://...")` and `ResourceLoader.load("res://...")` calls.
 * @module plugins/godot/rules/load
 */

import * as path from 'path';
import type { IConnection, IRuleDetector } from '@codegraphy/plugin-api';
import type { GDScriptRuleContext } from '../parser';
import { isResPath, normalizePath } from '../parser';

/** Detects load() calls: load("res://..."), ResourceLoader.load("res://...") */
export function detect(content: string, _filePath: string, ctx: GDScriptRuleContext): IConnection[] {
  const connections: IConnection[] = [];
  const lines = content.split('\n');
  const regex = /(?<!pre)(?:ResourceLoader\.)?load\s*\(\s*["']([^"']+)["']\s*\)/g;

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
          resolvedPath: resolved ? normalizePath(path.join(ctx.workspaceRoot, resolved)) : null,
          type: 'dynamic',
          ruleId: 'load',
        });
      }
    }
  }

  return connections;
}

const rule: IRuleDetector<GDScriptRuleContext> = { id: 'load', detect };
export default rule;
