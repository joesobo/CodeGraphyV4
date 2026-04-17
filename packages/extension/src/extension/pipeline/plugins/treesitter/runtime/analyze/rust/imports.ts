import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '../../../../../../../core/plugins/types/contracts';
import type { ImportedBinding, SymbolWalkState, TreeWalkAction } from '../model';
import { getLastPathSegment, getNodeText } from '../nodes';
import { resolveRustUsePath } from '../rustPaths';
import { addImportRelation } from '../results';

export function handleRustUseDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
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
