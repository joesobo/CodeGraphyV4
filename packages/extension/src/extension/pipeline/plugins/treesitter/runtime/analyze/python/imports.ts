import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '../../../../../../../core/plugins/types/contracts';
import type { ImportedBinding, SymbolWalkState, TreeWalkAction } from '../model';
import { getIdentifierText, getLastPathSegment, getNodeText } from '../nodes';
import { resolvePythonModulePath } from './paths';
export { handlePythonImportFromStatement } from './importFrom';
import { addImportRelation } from '../results';

export function handlePythonImportStatement(
  node: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  importedBindings: Map<string, ImportedBinding>,
): TreeWalkAction<SymbolWalkState> {
  const moduleNodes = node.namedChildren.filter((child) =>
    child.type === 'dotted_name' || child.type === 'aliased_import',
  );
  for (const moduleNode of moduleNodes) {
    const specifier = moduleNode.type === 'aliased_import'
      ? getNodeText(moduleNode.childForFieldName('name') ?? moduleNode.namedChildren[0])
      : getNodeText(moduleNode);
    const aliasName = getIdentifierText(moduleNode.childForFieldName('alias'));
    if (!specifier) {
      continue;
    }

    const resolvedPath = resolvePythonModulePath(filePath, workspaceRoot, specifier);
    addImportRelation(relations, filePath, specifier, resolvedPath);
    importedBindings.set(aliasName ?? getLastPathSegment(specifier, '.'), {
      importedName: specifier,
      resolvedPath,
      specifier,
    });
  }

  return { skipChildren: true };
}
