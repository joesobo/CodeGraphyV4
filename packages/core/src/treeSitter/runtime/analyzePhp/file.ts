import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '@codegraphy/plugin-api';
import type { ImportedBinding, SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { normalizeAnalysisResult } from '../analyze/results';
import { walkTree } from '../analyze/walk';
import { handlePhpNamespaceUseDeclaration } from './imports';
import { resolvePhpSourceInfo } from './sourceInfo';
import {
  handlePhpFunctionDefinition,
  handlePhpMethodDeclaration,
  handlePhpTypeDeclaration,
} from './symbols';

const PHP_TYPE_DECLARATION_NODE_TYPES = new Set([
  'class_declaration',
  'enum_declaration',
  'interface_declaration',
  'trait_declaration',
]);

function visitPhpNode(
  node: Parser.SyntaxNode,
  filePath: string,
  sourceRoot: string | null,
  namespaceName: string | null,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  importedBindings: Map<string, ImportedBinding>,
): TreeWalkAction<SymbolWalkState> | void {
  if (node.type === 'namespace_use_declaration') {
    handlePhpNamespaceUseDeclaration(node, filePath, sourceRoot, relations, importedBindings);
    return { skipChildren: true };
  }

  if (PHP_TYPE_DECLARATION_NODE_TYPES.has(node.type)) {
    handlePhpTypeDeclaration(
      node,
      filePath,
      sourceRoot,
      namespaceName,
      relations,
      symbols,
      importedBindings,
    );
    return;
  }

  if (node.type === 'function_definition') {
    return handlePhpFunctionDefinition(node, filePath, symbols);
  }

  if (node.type === 'method_declaration') {
    return handlePhpMethodDeclaration(node, filePath, symbols);
  }

  return;
}

export function analyzePhpFile(
  filePath: string,
  tree: Parser.Tree,
): IFileAnalysisResult {
  const importedBindings = new Map<string, ImportedBinding>();
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  const { namespaceName, sourceRoot } = resolvePhpSourceInfo(filePath, tree);
  walkTree(tree.rootNode, {}, (node) =>
    visitPhpNode(
      node,
      filePath,
      sourceRoot,
      namespaceName,
      relations,
      symbols,
      importedBindings,
    ),
  );
  return normalizeAnalysisResult(filePath, symbols, relations);
}
