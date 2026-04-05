/**
 * @fileoverview CommonJS require detection rule.
 * Finds `require('module')` calls anywhere in the AST.
 * @module plugins/typescript/sources/commonjs-require
 */

import * as ts from 'typescript';
import type { IConnection, IConnectionDetector } from '@codegraphy-vscode/plugin-api';
import type { TsRuleContext } from '../types';
import { getScriptKind } from '../getScriptKind';

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
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'require' &&
      node.arguments.length > 0
    ) {
      const arg = node.arguments[0];
      if (ts.isStringLiteral(arg)) {
        const specifier = arg.text;
        connections.push({
          kind: 'import',
          specifier,
          resolvedPath: context.resolver.resolve(specifier, filePath),
          type: 'require',
          sourceId: 'commonjs-require',
        });
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return connections;
}

const rule: IConnectionDetector<TsRuleContext> = {
  id: 'commonjs-require',
  detect,
};

export default rule;
export { detect };
