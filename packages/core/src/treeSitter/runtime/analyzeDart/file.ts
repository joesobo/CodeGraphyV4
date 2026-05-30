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
import {
  shouldIncludeTreeSitterSymbols,
  type TreeSitterAnalysisOptions,
} from '../options';

function visitDartNode(
  node: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  symbolsEnabled: boolean,
): TreeWalkAction<SymbolWalkState> | void {
  if (node.type === 'library_import') {
    handleDartLibraryImport(node, filePath, workspaceRoot, relations);
    return { skipChildren: true };
  }

  if (node.type === 'class_definition') {
    if (!symbolsEnabled) {
      return;
    }
    handleDartClassDefinition(node, filePath, relations, symbols);
    return;
  }

  if (node.type === 'mixin_declaration' || node.type === 'enum_declaration') {
    if (!symbolsEnabled) {
      return;
    }
    handleDartTypeDeclaration(node, filePath, symbols);
    return;
  }

  if (node.type === 'method_signature') {
    return symbolsEnabled
      ? handleDartFunctionSignature(node, filePath, symbols)
      : undefined;
  }

  if (node.type === 'function_signature' && node.parent?.type !== 'method_signature') {
    return symbolsEnabled
      ? handleDartFunctionSignature(node, filePath, symbols)
      : undefined;
  }

  return;
}

export function analyzeDartFile(
  filePath: string,
  tree: Parser.Tree,
  workspaceRoot: string,
  options: TreeSitterAnalysisOptions = {},
): IFileAnalysisResult {
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  const symbolsEnabled = shouldIncludeTreeSitterSymbols(options);
  walkTree(tree.rootNode, {}, (node) =>
    visitDartNode(node, filePath, workspaceRoot, relations, symbols, symbolsEnabled),
  );
  return normalizeAnalysisResult(filePath, symbols, relations);
}
