import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '@codegraphy-dev/plugin-api';
import type { ImportedBinding, SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { addCallRelation, normalizeAnalysisResult } from '../analyze/results';
import { walkTree } from '../analyze/walk';
import { handleRubyRequireCall } from './imports';
import {
  handleRubyClass,
  handleRubyMethod,
  handleRubyModule,
} from './symbols';
import {
  shouldIncludeTreeSitterSymbols,
  type TreeSitterAnalysisOptions,
} from '../options';

function visitRubyNode(
  node: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  importedBindings: Map<string, ImportedBinding>,
  symbolsEnabled: boolean,
): TreeWalkAction<SymbolWalkState> | void {
  if (node.type === 'call' && handleRubyRequireCall(node, filePath, workspaceRoot, relations, importedBindings)) {
    return { skipChildren: true };
  }

  if (node.type === 'module') {
    if (!symbolsEnabled) {
      return;
    }
    handleRubyModule(node, filePath, symbols);
    return;
  }

  if (node.type === 'class') {
    handleRubyClass(node, filePath, relations, symbols, importedBindings, symbolsEnabled);
    return;
  }

  if (node.type === 'method') {
    return symbolsEnabled
      ? handleRubyMethod(node, filePath, symbols)
      : undefined;
  }

  return;
}

export function analyzeRubyFile(
  filePath: string,
  tree: Parser.Tree,
  workspaceRoot: string,
  options: TreeSitterAnalysisOptions = {},
): IFileAnalysisResult {
  const importedBindings = new Map<string, ImportedBinding>();
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  const symbolsEnabled = shouldIncludeTreeSitterSymbols(options);
  walkTree<SymbolWalkState>(tree.rootNode, {}, (node, state) => {
    const action = visitRubyNode(node, filePath, workspaceRoot, relations, symbols, importedBindings, symbolsEnabled);
    if (node.type === 'call') {
      handleRubyImportedCall(node, filePath, relations, importedBindings, state.currentSymbolId);
    }
    return action;
  });
  return normalizeAnalysisResult(filePath, symbols, relations);
}

function handleRubyImportedCall(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  importedBindings: ReadonlyMap<string, ImportedBinding>,
  currentSymbolId?: string,
): void {
  const receiver = node.childForFieldName('receiver') ?? node.namedChildren[0];
  const constantName = receiver?.type === 'constant'
    ? receiver.text
    : receiver?.type === 'scope_resolution'
      ? receiver.namedChildren.at(-1)?.text
      : null;
  if (!constantName) {
    return;
  }

  const binding = importedBindings.get(constantName);
  if (!binding?.resolvedPath) {
    return;
  }

  addCallRelation(relations, filePath, binding, currentSymbolId);
}
