/**
 * @fileoverview Re-export detection rule.
 * Finds `export { x } from 'y'`, `export * from 'y'`, etc.
 * @module plugins/typescript/sources/reexport
 */

import * as ts from 'typescript';
import type { IAnalysisRelation } from '@codegraphy-vscode/plugin-api';
import type { TsRuleContext } from '../ruleContext';
import { getScriptKind } from '../getScriptKind';

export const SOURCE_ID = 'reexport';

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
    if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      if (ts.isStringLiteral(node.moduleSpecifier)) {
        const specifier = node.moduleSpecifier.text;
        const resolvedPath = context.resolver.resolve(specifier, filePath);
        relations.push({
          kind: 'reexport',
          specifier,
          resolvedPath,
          fromFilePath: filePath,
          toFilePath: resolvedPath,
          type: 'reexport',
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
