/**
 * @fileoverview Re-export detection rule.
 * Finds `export { x } from 'y'`, `export * from 'y'`, etc.
 * @module plugins/typescript/sources/reexport
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
    if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      if (ts.isStringLiteral(node.moduleSpecifier)) {
        const specifier = node.moduleSpecifier.text;
        connections.push({
          kind: 'reexport',
          specifier,
          resolvedPath: context.resolver.resolve(specifier, filePath),
          type: 'reexport',
          sourceId: 'reexport',
        });
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return connections;
}

const rule: IConnectionDetector<TsRuleContext> = {
  id: 'reexport',
  detect,
};

export default rule;
export { detect };
