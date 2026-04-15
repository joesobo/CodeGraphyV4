import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '../../../../../../core/plugins/types/contracts';
import { TREE_SITTER_SOURCE_IDS } from '../languages';
import { resolveTreeSitterImportPath } from '../resolve';
import { collectImportBindings, getImportedBindingByIdentifier, getImportedBindingByPropertyAccess, getVariableAssignedFunctionSymbol } from './imports';
import type { ImportedBinding, SymbolWalkState, TreeWalkAction } from './model';
import { getIdentifierText, getStringSpecifier } from './nodes';
import { addCallRelation, addImportRelation, addRelation, createSymbol, normalizeAnalysisResult } from './results';
import { walkSymbolBody, walkTree } from './walk';

function getImportedBindingForJavaScriptCall(
  callExpression: Parser.SyntaxNode,
  importedBindings: ReadonlyMap<string, ImportedBinding>,
): ImportedBinding | null {
  const calleeNode = callExpression.childForFieldName('function') ?? callExpression.namedChildren[0];
  return (
    getImportedBindingByIdentifier(calleeNode, importedBindings)
    ?? getImportedBindingByPropertyAccess(calleeNode, importedBindings, 'member_expression', 'object')
  );
}

function getImportRelationForJavaScriptCallExpression(
  callExpression: Parser.SyntaxNode,
  filePath: string,
): IAnalysisRelation | null {
  const calleeNode = callExpression.childForFieldName('function') ?? callExpression.namedChildren[0];
  const argumentsNode = callExpression.childForFieldName('arguments')
    ?? callExpression.namedChildren.find((child) => child.type === 'arguments');
  const stringNode = argumentsNode?.namedChildren.find((child) =>
    child.type === 'string' || child.type === 'interpreted_string_literal',
  );
  const specifier = getStringSpecifier(stringNode);
  if (!specifier) {
    return null;
  }

  const resolvedPath = resolveTreeSitterImportPath(filePath, specifier);
  if (calleeNode?.type === 'import') {
    return {
      kind: 'import',
      sourceId: TREE_SITTER_SOURCE_IDS.dynamicImport,
      fromFilePath: filePath,
      specifier,
      resolvedPath,
      toFilePath: resolvedPath,
      type: 'dynamic',
    };
  }

  if (getIdentifierText(calleeNode) !== 'require') {
    return null;
  }

  return {
    kind: 'import',
    sourceId: TREE_SITTER_SOURCE_IDS.commonjsRequire,
    fromFilePath: filePath,
    specifier,
    resolvedPath,
    toFilePath: resolvedPath,
    type: 'require',
  };
}

function visitJavaScriptNode(
  node: Parser.SyntaxNode,
  state: SymbolWalkState,
  walk: (node: Parser.SyntaxNode, context: SymbolWalkState) => void,
  filePath: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  importedBindings: Map<string, ImportedBinding>,
): TreeWalkAction<SymbolWalkState> | void {
  switch (node.type) {
    case 'import_statement': {
      const specifier = getStringSpecifier(node.namedChildren.find((child) => child.type === 'string'));
      if (specifier) {
        const resolvedPath = resolveTreeSitterImportPath(filePath, specifier);
        collectImportBindings(node, specifier, resolvedPath, importedBindings);
        addImportRelation(relations, filePath, specifier, resolvedPath);
      }
      return { skipChildren: true };
    }
    case 'export_statement': {
      const specifier = getStringSpecifier(node.namedChildren.find((child) => child.type === 'string'));
      if (specifier) {
        const resolvedPath = resolveTreeSitterImportPath(filePath, specifier);
        addRelation(relations, {
          kind: 'reexport',
          sourceId: TREE_SITTER_SOURCE_IDS.reexport,
          fromFilePath: filePath,
          specifier,
          resolvedPath,
          toFilePath: resolvedPath,
        });
      }
      return;
    }
    case 'function_declaration': {
      const name = getIdentifierText(node.childForFieldName('name') ?? node.namedChildren[0]);
      if (!name) {
        return;
      }

      const symbol = createSymbol(filePath, 'function', name, node);
      symbols.push(symbol);
      return walkSymbolBody(node, symbol.id, walk);
    }
    case 'class_declaration': {
      const name = getIdentifierText(node.childForFieldName('name') ?? node.namedChildren[0]);
      if (name) {
        symbols.push(createSymbol(filePath, 'class', name, node));
      }
      return;
    }
    case 'method_definition': {
      const name = getIdentifierText(node.childForFieldName('name') ?? node.namedChildren[0]);
      if (!name) {
        return;
      }

      const symbol = createSymbol(filePath, 'method', name, node);
      symbols.push(symbol);
      return walkSymbolBody(node, symbol.id, walk);
    }
    case 'variable_declarator': {
      const symbol = getVariableAssignedFunctionSymbol(node, filePath);
      if (!symbol) {
        return;
      }

      symbols.push(symbol);
      const valueNode = node.childForFieldName('value') ?? node.namedChildren.at(-1);
      const body = valueNode?.childForFieldName('body') ?? valueNode?.namedChildren.at(-1);
      if (body) {
        walk(body, { currentSymbolId: symbol.id });
      }

      return { skipChildren: true };
    }
    case 'call_expression': {
      const importRelation = getImportRelationForJavaScriptCallExpression(node, filePath);
      if (importRelation) {
        relations.push(importRelation);
        return;
      }

      const binding = getImportedBindingForJavaScriptCall(node, importedBindings);
      if (binding) {
        addCallRelation(relations, filePath, binding, state.currentSymbolId);
      }
      return;
    }
    default:
      return;
  }
}

export function analyzeJavaScriptFamilyFile(
  filePath: string,
  tree: Parser.Tree,
): IFileAnalysisResult {
  const importedBindings = new Map<string, ImportedBinding>();
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  walkTree(tree.rootNode, {}, (node, state, walk) =>
    visitJavaScriptNode(node, state, walk, filePath, relations, symbols, importedBindings),
  );
  return normalizeAnalysisResult(filePath, symbols, relations);
}
