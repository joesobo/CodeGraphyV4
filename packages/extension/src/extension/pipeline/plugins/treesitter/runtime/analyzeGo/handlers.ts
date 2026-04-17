import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
} from '../../../../../../core/plugins/types/contracts';
import { getImportedBindingByIdentifier, getImportedBindingByPropertyAccess } from '../analyze/imports';
import type { ImportedBinding, SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { getIdentifierText } from '../analyze/nodes';
import { addCallRelation, createSymbol } from '../analyze/results';
import { walkSymbolBody } from '../analyze/walk';

function getGoCallBinding(
  callExpression: Parser.SyntaxNode,
  importedBindings: ReadonlyMap<string, ImportedBinding>,
): ImportedBinding | null {
  const calleeNode = callExpression.childForFieldName('function') ?? callExpression.namedChildren[0];
  return (
    getImportedBindingByIdentifier(calleeNode, importedBindings)
    ?? getImportedBindingByPropertyAccess(calleeNode, importedBindings, 'selector_expression', 'operand')
  );
}

function getGoTypeKind(node: Parser.SyntaxNode): 'interface' | 'struct' | 'type' {
  const typeNode = node.childForFieldName('type') ?? node.namedChildren.at(-1);
  if (typeNode?.type === 'interface_type') {
    return 'interface';
  }

  if (typeNode?.type === 'struct_type') {
    return 'struct';
  }

  return 'type';
}

export function handleGoCallableDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  walk: (node: Parser.SyntaxNode, context: SymbolWalkState) => void,
): TreeWalkAction<SymbolWalkState> | void {
  const name = getIdentifierText(node.childForFieldName('name'));
  if (!name) {
    return;
  }

  const kind = node.type === 'method_declaration' ? 'method' : 'function';
  const symbol = createSymbol(filePath, kind, name, node);
  symbols.push(symbol);
  return walkSymbolBody(node, symbol.id, walk);
}

export function handleGoTypeSpec(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): void {
  const name = getIdentifierText(node.childForFieldName('name'));
  if (name) {
    symbols.push(createSymbol(filePath, getGoTypeKind(node), name, node));
  }
}

export function handleGoCallExpression(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  importedBindings: ReadonlyMap<string, ImportedBinding>,
  currentSymbolId?: string,
): void {
  const binding = getGoCallBinding(node, importedBindings);
  if (binding) {
    addCallRelation(relations, filePath, binding, currentSymbolId);
  }
}
