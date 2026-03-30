/**
 * @fileoverview CommonJS require detection rule.
 * Finds `require('module')` calls anywhere in the AST.
 * @module plugins/typescript/rules/commonjs-require
 */

import * as ts from 'typescript';
import type { IConnection, IRuleDetector } from '@codegraphy-vscode/plugin-api';
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
          specifier,
          resolvedPath: context.resolver.resolve(specifier, filePath),
          type: 'require',
          ruleId: 'commonjs-require',
        });
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return connections;
}

const rule: IRuleDetector<TsRuleContext> = {
  id: 'commonjs-require',
  detect,
};

export default rule;
export { detect };
