import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '@codegraphy-dev/plugin-api';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { normalizeAnalysisResult } from '../analyze/results';
import { walkTree } from '../analyze/walk';
import { handleDartLibraryImport } from './imports';
import {
  handleDartClassDefinition,
  handleDartFunctionSignature,
  handleDartTypeDeclaration,
} from './symbols';

function visitDartNode(
  node: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
): TreeWalkAction<SymbolWalkState> | void {
  if (node.type === 'library_import') {
    handleDartLibraryImport(node, filePath, workspaceRoot, relations);
    return { skipChildren: true };
  }

  if (node.type === 'class_definition') {
    handleDartClassDefinition(node, filePath, relations, symbols);
    return;
  }

  if (node.type === 'mixin_declaration' || node.type === 'enum_declaration') {
    handleDartTypeDeclaration(node, filePath, symbols);
    return;
  }

  if (node.type === 'method_signature') {
    return handleDartFunctionSignature(node, filePath, symbols);
  }

  if (node.type === 'function_signature' && node.parent?.type !== 'method_signature') {
    return handleDartFunctionSignature(node, filePath, symbols);
  }

  return;
}

export function analyzeDartFile(
  filePath: string,
  tree: Parser.Tree,
  workspaceRoot: string,
): IFileAnalysisResult {
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  walkTree(tree.rootNode, {}, (node) =>
    visitDartNode(node, filePath, workspaceRoot, relations, symbols),
  );
  return normalizeAnalysisResult(filePath, symbols, relations);
}
