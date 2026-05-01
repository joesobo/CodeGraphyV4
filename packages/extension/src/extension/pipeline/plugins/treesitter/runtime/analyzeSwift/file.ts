import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '../../../../../../core/plugins/types/contracts';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { normalizeAnalysisResult } from '../analyze/results';
import { walkTree } from '../analyze/walk';
import { handleSwiftImportDeclaration } from './imports';
import {
  handleSwiftFunctionDeclaration,
  handleSwiftTypeDeclaration,
} from './symbols';

const SWIFT_TYPE_DECLARATION_NODE_TYPES = new Set([
  'class_declaration',
  'protocol_declaration',
]);

function visitSwiftNode(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
): TreeWalkAction<SymbolWalkState> | void {
  if (node.type === 'import_declaration') {
    handleSwiftImportDeclaration(node, filePath, relations);
    return { skipChildren: true };
  }

  if (SWIFT_TYPE_DECLARATION_NODE_TYPES.has(node.type)) {
    handleSwiftTypeDeclaration(node, filePath, relations, symbols);
    return;
  }

  if (node.type === 'function_declaration') {
    return handleSwiftFunctionDeclaration(node, filePath, symbols);
  }

  return;
}

export function analyzeSwiftFile(
  filePath: string,
  tree: Parser.Tree,
): IFileAnalysisResult {
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  walkTree(tree.rootNode, {}, (node) =>
    visitSwiftNode(node, filePath, relations, symbols),
  );
  return normalizeAnalysisResult(filePath, symbols, relations);
}
