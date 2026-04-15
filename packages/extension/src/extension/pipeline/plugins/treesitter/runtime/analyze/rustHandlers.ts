import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
} from '../../../../../../core/plugins/types/contracts';
import { getRustCallBinding } from './rustBindings';
import type { ImportedBinding, SymbolWalkState, TreeWalkAction } from './model';
import { getIdentifierText } from './nodes';
import { resolveRustModuleDeclarationPath } from './paths';
import { addCallRelation, addImportRelation, createSymbol } from './results';
import { walkSymbolBody } from './walk';

export function handleRustModuleItem(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
): void {
  const moduleName = getIdentifierText(node.childForFieldName('name'));
  if (moduleName) {
    addImportRelation(
      relations,
      filePath,
      moduleName,
      resolveRustModuleDeclarationPath(filePath, moduleName),
    );
  }
}

export function handleRustNamedSymbol(
  node: Parser.SyntaxNode,
  kind: 'struct' | 'enum' | 'trait',
  filePath: string,
  symbols: IAnalysisSymbol[],
): void {
  const name = getIdentifierText(node.childForFieldName('name'));
  if (name) {
    symbols.push(createSymbol(filePath, kind, name, node));
  }
}

export function handleRustFunctionItem(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  walk: (node: Parser.SyntaxNode, context: SymbolWalkState) => void,
): TreeWalkAction<SymbolWalkState> | void {
  const name = getIdentifierText(node.childForFieldName('name'));
  if (!name) {
    return;
  }

  const kind = node.parent?.type === 'declaration_list' && node.parent.parent?.type === 'impl_item'
    ? 'method'
    : 'function';
  const symbol = createSymbol(filePath, kind, name, node);
  symbols.push(symbol);
  return walkSymbolBody(node, symbol.id, walk);
}

export function handleRustCallExpression(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  importedBindings: ReadonlyMap<string, ImportedBinding>,
  currentSymbolId?: string,
): void {
  const binding = getRustCallBinding(node, importedBindings);
  if (binding) {
    addCallRelation(relations, filePath, binding, currentSymbolId);
  }
}
