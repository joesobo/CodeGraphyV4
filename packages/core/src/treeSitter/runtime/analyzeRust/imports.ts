import type Parser from 'tree-sitter';
import type { IAnalysisRelationshipEvidence } from '@codegraphy-dev/plugin-api';
import type { ImportedBinding, SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { getLastPathSegment, getNodeText } from '../analyze/nodes';
import { resolveRustUsePath } from './paths';
import { addImportRelation } from '../analyze/results';

export function handleRustUseDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelationshipEvidence[],
  importedBindings: Map<string, ImportedBinding>,
): TreeWalkAction<SymbolWalkState> | void {
  const specifier = getNodeText(node.childForFieldName('argument'));
  if (!specifier) {
    return;
  }

  const resolvedPath = resolveRustUsePath(filePath, workspaceRoot, specifier);
  addImportRelation(relations, filePath, specifier, resolvedPath);
  importedBindings.set(getLastPathSegment(specifier, '::'), {
    importedName: getLastPathSegment(specifier, '::'),
    resolvedPath,
    specifier,
  });
}
