/**
 * @fileoverview Standard import detection rule for Python.
 * Finds `import os`, `import os.path`, `import x as y`, `import a, b, c`.
 * @module plugins/python/rules/standard-import
 */

import type { IConnection, IRuleDetector } from '../../../core/plugins/types';
import { preprocessMultilineImports, isCommentOrString } from '../preprocess';
import type { PythonRuleContext } from '../preprocess';

/** Detects standard import statements: import os, import os.path, import x as y */
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

    const match = trimmed.match(/^import\s+([\w.,\s]+)/);
    if (match) {
      const modules = match[1].split(',').map(m => m.trim().split(/\s+as\s+/)[0]);
      for (const module of modules) {
        if (module && !module.includes(' ')) {
          const imp = {
            module,
            isRelative: false,
            relativeLevel: 0,
            type: 'import' as const,
            line: 0,
            names: undefined,
          };
          const resolvedPath = ctx.resolver.resolve(imp, filePath);
          connections.push({
            specifier: module,
            resolvedPath,
            type: 'static',
            ruleId: 'standard-import',
          });
        }
      }
    }
  }

  return connections;
}

const rule: IRuleDetector<PythonRuleContext> = {
  id: 'standard-import',
  detect,
};

export default rule;
export { detect };
