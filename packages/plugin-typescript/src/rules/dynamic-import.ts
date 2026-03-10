/**
 * @fileoverview Dynamic import detection rule.
 * Finds `import('module')` expressions anywhere in the AST.
 * @module plugins/typescript/rules/dynamic-import
 */

import * as ts from 'typescript';
import type { IConnection, IRuleDetector } from '@codegraphy/plugin-api';
import type { PathResolver } from '../PathResolver';

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
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      const arg = node.arguments[0];
      if (arg && ts.isStringLiteral(arg)) {
        const specifier = arg.text;
        connections.push({
          specifier,
          resolvedPath: context.resolver.resolve(specifier, filePath),
          type: 'dynamic',
          ruleId: 'dynamic-import',
        });
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return connections;
}

const rule: IRuleDetector<TsRuleContext> = {
  id: 'dynamic-import',
  detect,
};

export default rule;
export { detect };
