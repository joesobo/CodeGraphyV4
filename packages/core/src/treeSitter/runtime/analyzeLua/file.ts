import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '@codegraphy-dev/plugin-api';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { normalizeAnalysisResult } from '../analyze/results';
import { walkTree } from '../analyze/walk';
import { handleLuaFunctionCall } from './imports';
import {
  handleLuaFunctionDeclaration,
  handleLuaVariableDeclaration,
} from './symbols';
import {
  shouldIncludeTreeSitterSymbols,
  type TreeSitterAnalysisOptions,
} from '../options';
import { getLuaRequireLocalName, handleLuaRequiredModuleCall } from './calls';

function visitLuaNode(
  node: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  requiredModulesByLocalName: Map<string, IAnalysisRelation>,
  symbolsEnabled: boolean,
): TreeWalkAction<SymbolWalkState> | void {
  const importAction = visitLuaImport(node, filePath, workspaceRoot, relations, requiredModulesByLocalName);
  if (importAction) {
    return importAction;
  }

  if (node.type === 'variable_declaration') {
    if (symbolsEnabled) handleLuaVariableDeclaration(node, filePath, symbols);
    return;
  }

  if (node.type === 'function_declaration') {
    return symbolsEnabled
      ? handleLuaFunctionDeclaration(node, filePath, symbols)
      : undefined;
  }

  return;
}

function visitLuaImport(
  node: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  requiredModulesByLocalName: Map<string, IAnalysisRelation>,
): TreeWalkAction<SymbolWalkState> | undefined {
  if (node.type !== 'function_call' || !handleLuaFunctionCall(node, filePath, workspaceRoot, relations)) {
    return undefined;
  }
  const localName = getLuaRequireLocalName(node);
  const relation = relations.at(-1);
  if (localName && relation?.kind === 'import') requiredModulesByLocalName.set(localName, relation);
  return { skipChildren: true };
}

export function analyzeLuaFile(
  filePath: string,
  tree: Parser.Tree,
  workspaceRoot: string,
  options: TreeSitterAnalysisOptions = {},
): IFileAnalysisResult {
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  const requiredModulesByLocalName = new Map<string, IAnalysisRelation>();
  const symbolsEnabled = shouldIncludeTreeSitterSymbols(options);
  walkTree<SymbolWalkState>(tree.rootNode, {}, (node, state) => {
    const action = visitLuaNode(
      node,
      filePath,
      workspaceRoot,
      relations,
      symbols,
      requiredModulesByLocalName,
      symbolsEnabled,
    );
    if (node.type === 'function_call') {
      handleLuaRequiredModuleCall(node, filePath, relations, requiredModulesByLocalName, state.currentSymbolId);
    }
    return action;
  });
  return normalizeAnalysisResult(filePath, symbols, relations);
}
