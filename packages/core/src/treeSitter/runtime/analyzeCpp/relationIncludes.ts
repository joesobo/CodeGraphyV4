import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import { collectCppDeclarations } from './relationDeclarationCollect';
import {
  readIncludedCppRootNode,
  readInitialIncludedPaths,
  readTransitiveIncludedPaths,
} from './relationIncludeTraversal';
import type {
  CppIncludedDeclarations,
  MutableCppIncludedDeclarations,
} from './relationModel';

export function readCppIncludedDeclarations(
  rootNode: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
  relations: readonly IAnalysisRelation[],
): CppIncludedDeclarations {
  const declarations = createCppIncludedDeclarations();
  collectCppDeclarations(rootNode, filePath, declarations, { exposeMethodsAsCallTargets: false });

  for (const includedPath of readTransitiveIncludedPaths(readInitialIncludedPaths(relations), workspaceRoot)) {
    const includedRootNode = readIncludedCppRootNode(includedPath);
    if (includedRootNode) {
      collectCppDeclarations(includedRootNode, includedPath, declarations, { exposeMethodsAsCallTargets: true });
    }
  }

  return declarations;
}

function createCppIncludedDeclarations(): MutableCppIncludedDeclarations {
  return {
    functionPathByName: new Map<string, string | null>(),
    functionSymbolIdByName: new Map<string, string>(),
    methodCallPathByName: new Map<string, string | null>(),
    methodSymbolIdByName: new Map<string, string>(),
    methodPathByName: new Map<string, string | null>(),
    typePathByName: new Map<string, string | null>(),
  };
}
