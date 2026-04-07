/**
 * @fileoverview ES6 static import detection rule.
 * Finds `import x from 'y'`, `import { a } from 'y'`, etc.
 * @module plugins/typescript/sources/es6-import
 */

import * as ts from 'typescript';
import type { IConnection } from '@codegraphy-vscode/plugin-api';
import type { TsRuleContext } from '../types';
import { getScriptKind } from '../getScriptKind';

export const SOURCE_ID = 'es6-import';

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
    if (ts.isImportDeclaration(node) && node.moduleSpecifier) {
      if (ts.isStringLiteral(node.moduleSpecifier)) {
        const specifier = node.moduleSpecifier.text;
        connections.push({
          kind: 'import',
          specifier,
          resolvedPath: context.resolver.resolve(specifier, filePath),
          type: 'static',
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
