import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '../../../../../../core/plugins/types/contracts';
import {
  handleJavaImportDeclaration,
  handleJavaMethodDeclaration,
  handleJavaMethodInvocation,
  handleJavaTypeDeclaration,
  resolveJavaSourceInfo,
} from './javaHandlers';
import type { ImportedBinding, SymbolWalkState, TreeWalkAction } from './model';
import { normalizeAnalysisResult } from './results';
import { walkTree } from './walk';

function visitJavaNode(
  node: Parser.SyntaxNode,
  state: SymbolWalkState,
  walk: (node: Parser.SyntaxNode, context: SymbolWalkState) => void,
  filePath: string,
  sourceRoot: string | null,
  packageName: string | null,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  importedBindings: Map<string, ImportedBinding>,
): TreeWalkAction<SymbolWalkState> | void {
  switch (node.type) {
    case 'import_declaration': {
      handleJavaImportDeclaration(node, filePath, sourceRoot, relations, importedBindings);
      return;
    }
    case 'class_declaration':
    case 'interface_declaration':
    case 'enum_declaration': {
      handleJavaTypeDeclaration(
        node,
        filePath,
        sourceRoot,
        packageName,
        relations,
        symbols,
        importedBindings,
      );
      return;
    }
    case 'method_declaration': {
      return handleJavaMethodDeclaration(node, filePath, symbols, walk);
    }
    case 'method_invocation': {
      handleJavaMethodInvocation(node, filePath, relations, importedBindings, state.currentSymbolId);
      return;
    }
    default:
      return;
  }
}

export function analyzeJavaFile(
  filePath: string,
  tree: Parser.Tree,
): IFileAnalysisResult {
  const importedBindings = new Map<string, ImportedBinding>();
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  const { packageName, sourceRoot } = resolveJavaSourceInfo(filePath, tree);
  walkTree(tree.rootNode, {}, (node, state, walk) =>
    visitJavaNode(
      node,
      state,
      walk,
      filePath,
      sourceRoot,
      packageName,
      relations,
      symbols,
      importedBindings,
    ),
  );
  return normalizeAnalysisResult(filePath, symbols, relations);
}
