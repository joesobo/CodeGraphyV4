import type Parser from 'tree-sitter';
import type { IAnalysisRelationshipEvidence } from '@codegraphy-dev/plugin-api';
import { addImportRelation } from '../analyze/results';
import { resolveSwiftModuleImportPath } from './paths';

export function handleSwiftImportDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelationshipEvidence[],
): void {
  const specifier = node.namedChildren.find((child) => child.type === 'identifier')?.text;
  if (specifier) {
    addImportRelation(
      relations,
      filePath,
      specifier,
      resolveSwiftModuleImportPath(filePath, workspaceRoot, specifier),
    );
  }
}
