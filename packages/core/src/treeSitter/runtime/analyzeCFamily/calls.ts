import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import { addCallRelation } from '../analyze/results';
import { readDeclaredFunctions, readIncludedRootNode } from './callDeclarations';
import { readCallName, readEnclosingFunctionSymbolId } from './callSyntax';
import {
  createCallBinding,
  resolveCallTarget,
  setUniqueCallTarget,
  type CFamilyCallDeclarations,
  type CFamilyCallDeclarationTarget,
} from './callTargets';

export function readCFamilyCallDeclarations(
  rootNode: Parser.SyntaxNode,
  filePath: string,
  relations: readonly IAnalysisRelation[],
  language: Parser.Language,
  symbolsEnabled: boolean,
): CFamilyCallDeclarations {
  const functionTargetByName = new Map<string, CFamilyCallDeclarationTarget | null>();

  for (const declaration of readDeclaredFunctions(rootNode, filePath, symbolsEnabled)) {
    setUniqueCallTarget(functionTargetByName, declaration.name, declaration.target);
  }

  const includedPaths = relations
    .filter((relation) => (relation.kind === 'include' || relation.kind === 'import') && relation.resolvedPath)
    .map((relation) => relation.resolvedPath)
    .filter((resolvedPath): resolvedPath is string => Boolean(resolvedPath));

  for (const includedPath of includedPaths) {
    const includedRootNode = readIncludedRootNode(includedPath, language);
    if (!includedRootNode) {
      continue;
    }

    for (const declaration of readDeclaredFunctions(includedRootNode, includedPath, symbolsEnabled)) {
      setUniqueCallTarget(functionTargetByName, declaration.name, declaration.target);
    }
  }

  return {
    functionTargetByName,
  };
}

export function addCFamilyCallRelation(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  declarations: CFamilyCallDeclarations,
  symbolsEnabled: boolean,
): void {
  const calleeName = readCallName(node);
  if (!calleeName) {
    return;
  }

  const target = resolveCallTarget(declarations, calleeName);
  if (!target) {
    return;
  }

  addCallRelation(
    relations,
    filePath,
    createCallBinding(calleeName, target.filePath),
    symbolsEnabled ? readEnclosingFunctionSymbolId(node, filePath) : undefined,
    symbolsEnabled ? target.symbolId : undefined,
  );
}
