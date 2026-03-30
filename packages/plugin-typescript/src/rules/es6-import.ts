/**
 * @fileoverview ES6 static import detection rule.
 * Finds `import x from 'y'`, `import { a } from 'y'`, etc.
 * @module plugins/typescript/rules/es6-import
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
