/**
 * @fileoverview Re-export detection rule.
 * Finds `export { x } from 'y'`, `export * from 'y'`, etc.
 * @module plugins/typescript/rules/reexport
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
    if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      if (ts.isStringLiteral(node.moduleSpecifier)) {
        const specifier = node.moduleSpecifier.text;
        connections.push({
          specifier,
          resolvedPath: context.resolver.resolve(specifier, filePath),
          type: 'reexport',
          ruleId: 'reexport',
        });
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return connections;
}

const rule: IRuleDetector<TsRuleContext> = {
  id: 'reexport',
  detect,
};

export default rule;
export { detect };
