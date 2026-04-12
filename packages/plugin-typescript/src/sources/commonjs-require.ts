/**
 * @fileoverview CommonJS require detection rule.
 * Finds `require('module')` calls anywhere in the AST.
 * @module plugins/typescript/sources/commonjs-require
 */

import * as ts from 'typescript';
import type { IAnalysisRelation } from '@codegraphy-vscode/plugin-api';
import type { TsRuleContext } from '../ruleContext';
import { getScriptKind } from '../getScriptKind';

export const SOURCE_ID = 'commonjs-require';

function detect(
  content: string,
  filePath: string,
  context: TsRuleContext
): IAnalysisRelation[] {
  const relations: IAnalysisRelation[] = [];

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
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'require' &&
      node.arguments.length > 0
    ) {
      const arg = node.arguments[0];
      if (ts.isStringLiteral(arg)) {
        const specifier = arg.text;
        const resolvedPath = context.resolver.resolve(specifier, filePath);
        relations.push({
          kind: 'import',
          specifier,
          resolvedPath,
          fromFilePath: filePath,
          toFilePath: resolvedPath,
          type: 'require',
          sourceId: SOURCE_ID,
        });
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return relations;
}

export { detect };
