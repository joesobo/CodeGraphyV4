/**
 * @fileoverview Dynamic import detection rule.
 * Finds `import('module')` expressions anywhere in the AST.
 * @module plugins/typescript/sources/dynamic-import
 */

import * as ts from 'typescript';
import type { IConnection } from '@codegraphy-vscode/plugin-api';
import type { TsRuleContext } from '../types';
import { getScriptKind } from '../getScriptKind';

export const SOURCE_ID = 'dynamic-import';

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
    undefined,
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
          kind: 'import',
          specifier,
          resolvedPath: context.resolver.resolve(specifier, filePath),
          type: 'dynamic',
          sourceId: SOURCE_ID,
        });
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return connections;
}

export { detect };
