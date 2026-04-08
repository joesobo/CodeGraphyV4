/**
 * @fileoverview Re-export detection rule.
 * Finds `export { x } from 'y'`, `export * from 'y'`, etc.
 * @module plugins/typescript/sources/reexport
 */

import * as ts from 'typescript';
import type { IConnection } from '@codegraphy-vscode/plugin-api';
import type { TsRuleContext } from '../types';
import { getScriptKind } from '../getScriptKind';

export const SOURCE_ID = 'reexport';

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
    if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      if (ts.isStringLiteral(node.moduleSpecifier)) {
        const specifier = node.moduleSpecifier.text;
        connections.push({
          kind: 'reexport',
          specifier,
          resolvedPath: context.resolver.resolve(specifier, filePath),
          type: 'reexport',
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
