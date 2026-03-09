/**
 * @fileoverview ES6 static import detection rule.
 * Finds `import x from 'y'`, `import { a } from 'y'`, etc.
 * @module plugins/typescript/rules/es6-import
 */

import * as ts from 'typescript';
import { IConnection } from '../../../core/plugins';
import type { IRuleDetector } from '../../../core/plugins/types';
import type { PathResolver } from '../PathResolver';

/** Context provided by the TypeScript plugin orchestrator */
interface TsRuleContext {
  resolver: PathResolver;
}

function getScriptKind(fileName: string): ts.ScriptKind {
  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  switch (ext) {
    case '.tsx': return ts.ScriptKind.TSX;
    case '.ts': return ts.ScriptKind.TS;
    case '.jsx': return ts.ScriptKind.JSX;
    case '.js':
    case '.mjs':
    case '.cjs': return ts.ScriptKind.JS;
    default: return ts.ScriptKind.TS;
  }
}

function detect(
  content: string,
  filePath: string,
  context: TsRuleContext
): IConnection[] {
  const connections: IConnection[] = [];

  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    getScriptKind(filePath)
  );

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && node.moduleSpecifier) {
      if (ts.isStringLiteral(node.moduleSpecifier)) {
        const specifier = node.moduleSpecifier.text;
        connections.push({
          specifier,
          resolvedPath: context.resolver.resolve(specifier, filePath),
          type: 'static',
          ruleId: 'es6-import',
        });
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return connections;
}

const rule: IRuleDetector<TsRuleContext> = {
  id: 'es6-import',
  detect,
};

export default rule;
export { detect };
