import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '@codegraphy-dev/plugin-api';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { normalizeAnalysisResult } from '../analyze/results';
import { walkTree } from '../analyze/walk';
import { handleSwiftImportDeclaration } from './imports';
import {
  handleSwiftFunctionDeclaration,
  handleSwiftTypeDeclaration,
} from './symbols';
import {
  shouldIncludeTreeSitterSymbols,
  type TreeSitterAnalysisOptions,
} from '../options';

const SWIFT_TYPE_DECLARATION_NODE_TYPES = new Set([
  'class_declaration',
  'protocol_declaration',
]);

function visitSwiftNode(
  node: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  symbolsEnabled: boolean,
): TreeWalkAction<SymbolWalkState> | void {
  if (node.type === 'import_declaration') {
    handleSwiftImportDeclaration(node, filePath, workspaceRoot, relations);
    return { skipChildren: true };
  }

  if (SWIFT_TYPE_DECLARATION_NODE_TYPES.has(node.type)) {
    if (!symbolsEnabled) {
      return;
    }
    handleSwiftTypeDeclaration(node, filePath, relations, symbols);
    return;
  }

  if (node.type === 'function_declaration') {
    return symbolsEnabled
      ? handleSwiftFunctionDeclaration(node, filePath, symbols)
      : undefined;
  }

  return;
}

export function analyzeSwiftFile(
  filePath: string,
  tree: Parser.Tree,
  workspaceRoot: string,
  options: TreeSitterAnalysisOptions = {},
): IFileAnalysisResult {
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  const symbolsEnabled = shouldIncludeTreeSitterSymbols(options);
  walkTree(tree.rootNode, {}, (node) =>
    visitSwiftNode(node, filePath, workspaceRoot, relations, symbols, symbolsEnabled),
  );
  return normalizeAnalysisResult(filePath, symbols, relations);
}
