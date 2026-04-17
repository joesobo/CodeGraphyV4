import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '../../../../../../../core/plugins/types/contracts';
import type { ImportedBinding, SymbolWalkState, TreeWalkAction } from '../model';
import {
  getPythonImportFromImportedNodes,
  getPythonImportFromModuleNode,
  getPythonImportedName,
} from './importFromNodes';
import { resolvePythonImportFromPath } from './importFromPath';
import { getIdentifierText, getLastPathSegment, getNodeText, joinModuleSpecifier } from '../nodes';
import { resolvePythonModulePath } from './paths';
import { addImportRelation } from '../results';

export function handlePythonImportFromStatement(
  node: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  importedBindings: Map<string, ImportedBinding>,
): TreeWalkAction<SymbolWalkState> {
  const moduleNode = getPythonImportFromModuleNode(node);
  const moduleSpecifier = getNodeText(moduleNode) ?? '';
  const importedNodes = getPythonImportFromImportedNodes(node, moduleNode);
  if (importedNodes.length === 0) {
    if (moduleSpecifier) {
      addImportRelation(
        relations,
        filePath,
        moduleSpecifier,
        resolvePythonModulePath(filePath, workspaceRoot, moduleSpecifier),
      );
    }
    return { skipChildren: true };
  }

  for (const importedNode of importedNodes) {
    const importedName = getPythonImportedName(importedNode);
    if (!importedName) {
      continue;
    }

    const localName = getIdentifierText(importedNode.childForFieldName('alias'))
      ?? getLastPathSegment(importedName, '.');
    const specifier = joinModuleSpecifier(moduleSpecifier, importedName);
    const resolvedPath = resolvePythonImportFromPath(
      filePath,
      workspaceRoot,
      moduleSpecifier,
      specifier,
    );

    addImportRelation(relations, filePath, specifier, resolvedPath);
    importedBindings.set(localName, {
      importedName,
      resolvedPath,
      specifier,
    });
  }
  return { skipChildren: true };
}
