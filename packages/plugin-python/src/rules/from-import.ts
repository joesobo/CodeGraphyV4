/**
 * @fileoverview From-import detection rule for Python.
 * Finds `from os import path`, `from . import utils`, `from ..config import settings`.
 * @module plugins/python/rules/from-import
 */

import type { IConnection, IRuleDetector } from '@codegraphy/plugin-api';
import { preprocessMultilineImports, isCommentOrString } from '../preprocess';
import type { PythonRuleContext } from '../preprocess';

/** Detects from-import statements: from os import path, from . import utils */
function detect(
  content: string,
  filePath: string,
  ctx: PythonRuleContext
): IConnection[] {
  const processed = preprocessMultilineImports(content);
  const lines = processed.split('\n');
  const connections: IConnection[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (isCommentOrString(trimmed)) continue;

    const match = trimmed.match(/^from\s+(\.*)(\w[\w.]*|)\s+import\s+(.+)/);
    if (match) {
      const dots = match[1];
      const module = match[2] || '';
      const namesStr = match[3];
      const names = parseImportedNames(namesStr);

      const imp = {
        module,
        names: names.length > 0 ? names : undefined,
        isRelative: dots.length > 0,
        relativeLevel: dots.length,
        type: 'from' as const,
        line: 0,
      };
      const resolvedPath = ctx.resolver.resolve(imp, filePath);

      let specifier = imp.isRelative
        ? '.'.repeat(imp.relativeLevel) + (imp.module || '')
        : imp.module;
      if (imp.names && imp.names.length > 0) {
        specifier = `from ${specifier} import ${imp.names.join(', ')}`;
      }

      connections.push({
        specifier,
        resolvedPath,
        type: 'static',
        ruleId: 'from-import',
      });
    }
  }

  return connections;
}

function parseImportedNames(namesStr: string): string[] {
  const withoutComment = namesStr.split('#')[0].trim();
  if (withoutComment === '*') return ['*'];
  const cleaned = withoutComment.replace(/[()]/g, '');
  return cleaned
    .split(',')
    .map(n => n.trim().split(/\s+as\s+/)[0].trim())
    .filter(n => n.length > 0);
}

const rule: IRuleDetector<PythonRuleContext> = {
  id: 'from-import',
  detect,
};

export default rule;
export { detect };
