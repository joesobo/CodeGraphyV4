import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '@codegraphy-dev/plugin-api';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { addCallRelation, normalizeAnalysisResult } from '../analyze/results';
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

function visitLuaNode(
  node: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  requiredModulesByLocalName: Map<string, IAnalysisRelation>,
  symbolsEnabled: boolean,
): TreeWalkAction<SymbolWalkState> | void {
  if (node.type === 'function_call' && handleLuaFunctionCall(node, filePath, workspaceRoot, relations)) {
    const localName = getLuaRequireLocalName(node);
    const relation = relations.at(-1);
    if (localName && relation?.kind === 'import') {
      requiredModulesByLocalName.set(localName, relation);
    }
    return { skipChildren: true };
  }

  if (node.type === 'variable_declaration') {
    if (!symbolsEnabled) {
      return;
    }
    handleLuaVariableDeclaration(node, filePath, symbols);
    return;
  }

  if (node.type === 'function_declaration') {
    return symbolsEnabled
      ? handleLuaFunctionDeclaration(node, filePath, symbols)
      : undefined;
  }

  return;
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

function getLuaRequireLocalName(node: Parser.SyntaxNode): string | null {
  const assignment = node.parent?.parent;
  if (assignment?.type !== 'assignment_statement') {
    return null;
  }

  return assignment
    .descendantsOfType('variable_list')[0]
    ?.descendantsOfType('identifier')[0]
    ?.text ?? null;
}

function handleLuaRequiredModuleCall(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  requiredModulesByLocalName: ReadonlyMap<string, IAnalysisRelation>,
  currentSymbolId?: string,
): void {
  const callee = node.childForFieldName('name') ?? node.namedChildren[0];
  if (callee?.type !== 'dot_index_expression') {
    return;
  }

  const localName = callee.namedChildren[0]?.text;
  if (!localName) {
    return;
  }

  const importRelation = requiredModulesByLocalName.get(localName);
  if (!importRelation?.resolvedPath || !importRelation.specifier) {
    return;
  }

  addCallRelation(
    relations,
    filePath,
    {
      importedName: importRelation.specifier,
      localName,
      resolvedPath: importRelation.resolvedPath,
      specifier: importRelation.specifier,
    },
    currentSymbolId,
  );
}
