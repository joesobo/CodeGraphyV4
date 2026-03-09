/**
 * @fileoverview Re-export detection rule.
 * Finds `export { x } from 'y'`, `export * from 'y'`, etc.
 * @module plugins/typescript/rules/reexport
 */

import * as ts from 'typescript';
import { IConnection } from '../../../core/plugins';
import type { IRuleDetector } from '../../../core/plugins/types';
import type { PathResolver } from '../PathResolver';

interface TsRuleContext {
  resolver: PathResolver;
}

function getScriptKind(fileName: string): ts.ScriptKind {
  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  switch (ext) {
    case '.tsx': return ts.ScriptKind.TSX;
    case '.ts': return ts.ScriptKind.TS;
    case '.jsx': return ts.ScriptKind.JSX;
    case '.js':
    case '.mjs':
    case '.cjs': return ts.ScriptKind.JS;
    default: return ts.ScriptKind.TS;
  }
}

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
