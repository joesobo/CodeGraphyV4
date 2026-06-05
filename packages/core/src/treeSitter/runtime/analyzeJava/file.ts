import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '@codegraphy-dev/plugin-api';
import {
  handleJavaImportDeclaration,
  handleJavaMethodDeclaration,
  handleJavaMethodInvocation,
  handleJavaTypeDeclaration,
  resolveJavaSourceInfo,
} from './handlers';
import type { ImportedBinding, SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { normalizeAnalysisResult } from '../analyze/results';
import { walkTree } from '../analyze/walk';
import {
  shouldIncludeTreeSitterSymbols,
  type TreeSitterAnalysisOptions,
} from '../options';

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
  symbolsEnabled: boolean,
): TreeWalkAction<SymbolWalkState> | void {
  switch (node.type) {
    case 'import_declaration': {
      handleJavaImportDeclaration(node, filePath, sourceRoot, relations, importedBindings);
      return;
    }
    case 'class_declaration':
    case 'interface_declaration':
    case 'enum_declaration': {
      if (symbolsEnabled) {
        handleJavaTypeDeclaration(
          node,
          filePath,
          sourceRoot,
          packageName,
          relations,
          symbols,
          importedBindings,
        );
      }
      return;
    }
    case 'method_declaration': {
      return symbolsEnabled
        ? handleJavaMethodDeclaration(node, filePath, symbols, walk)
        : undefined;
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
  _workspaceRoot: string,
  options: TreeSitterAnalysisOptions = {},
): IFileAnalysisResult {
  const importedBindings = new Map<string, ImportedBinding>();
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  const symbolsEnabled = shouldIncludeTreeSitterSymbols(options);
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
      symbolsEnabled,
    ),
  );
  return normalizeAnalysisResult(filePath, symbols, relations);
}
