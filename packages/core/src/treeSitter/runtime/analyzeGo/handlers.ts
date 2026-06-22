import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
} from '@codegraphy-dev/plugin-api';
import { getImportedBindingByIdentifier, getImportedBindingByPropertyAccess } from '../analyze/imports';
import type { ImportedBinding, SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { getIdentifierText } from '../analyze/nodes';
import {
  addCallRelation,
  addInheritRelation,
  addReferenceRelation,
  createSymbol,
  createSymbolId,
} from '../analyze/results';
import { walkSymbolBody } from '../analyze/walk';

function getGoCallBinding(
  callExpression: Parser.SyntaxNode,
  importedBindings: ReadonlyMap<string, ImportedBinding>,
): ImportedBinding | null {
  const calleeNode = callExpression.childForFieldName('function') ?? callExpression.namedChildren[0];
  return (
    getImportedBindingByIdentifier(calleeNode, importedBindings)
    ?? getImportedBindingByPropertyAccess(calleeNode, importedBindings, 'selector_expression', 'operand', 'field')
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

function getGoQualifiedTypeBinding(
  node: Parser.SyntaxNode,
  importedBindings: ReadonlyMap<string, ImportedBinding>,
): ImportedBinding | null {
  if (node.type !== 'qualified_type') {
    return null;
  }

  const packageName = getIdentifierText(node.childForFieldName('package') ?? node.namedChildren[0]);
  return packageName ? importedBindings.get(packageName) ?? null : null;
}

function getGoEmbeddedQualifiedTypes(typeNode: Parser.SyntaxNode | null | undefined): Parser.SyntaxNode[] {
  if (typeNode?.type !== 'struct_type') {
    return [];
  }

  return typeNode
    .descendantsOfType('field_declaration')
    .flatMap((fieldDeclaration) => {
      const namedChildren = fieldDeclaration.namedChildren;
      if (namedChildren.length !== 1 || namedChildren[0]?.type !== 'qualified_type') {
        return [];
      }

      return [namedChildren[0]];
    });
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
  relations?: IAnalysisRelation[],
  importedBindings?: ReadonlyMap<string, ImportedBinding>,
  options: { includeSymbolEndpoint?: boolean } = {},
): void {
  const name = getIdentifierText(node.childForFieldName('name'));
  if (name) {
    const kind = getGoTypeKind(node);
    symbols.push(createSymbol(filePath, kind, name, node));

    if (kind !== 'struct' || !relations || !importedBindings) {
      return;
    }

    handleGoEmbeddedStructInheritance(node, filePath, name, relations, importedBindings, options);
  }
}

export function handleGoTypeSpecRelations(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  importedBindings: ReadonlyMap<string, ImportedBinding>,
): void {
  const name = getIdentifierText(node.childForFieldName('name'));
  if (name && getGoTypeKind(node) === 'struct') {
    handleGoEmbeddedStructInheritance(node, filePath, name, relations, importedBindings);
  }
}

function handleGoEmbeddedStructInheritance(
  node: Parser.SyntaxNode,
  filePath: string,
  name: string,
  relations: IAnalysisRelation[],
  importedBindings: ReadonlyMap<string, ImportedBinding>,
  options: { includeSymbolEndpoint?: boolean } = {},
): void {
  const typeNode = node.childForFieldName('type') ?? node.namedChildren.at(-1);
  for (const qualifiedType of getGoEmbeddedQualifiedTypes(typeNode)) {
    const binding = getGoQualifiedTypeBinding(qualifiedType, importedBindings);
    if (binding) {
      addInheritRelation(
        relations,
        filePath,
        qualifiedType.text,
        binding.resolvedPath,
        options.includeSymbolEndpoint ? createSymbolId(filePath, 'struct', name) : undefined,
      );
    }
  }
}

export function handleGoConstSpec(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): void {
  const nameNode = node.childForFieldName('name') ?? node.namedChildren.find(child => child.type === 'identifier');
  const name = getIdentifierText(nameNode);
  if (name) {
    symbols.push(createSymbol(filePath, 'constant', name, node));
  }
}

export function handleGoShortVarDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): void {
  const leftExpressionList = node.namedChildren[0];
  if (!leftExpressionList) {
    return;
  }

  for (const child of leftExpressionList.namedChildren) {
    const name = getIdentifierText(child);
    if (name) {
      symbols.push(createSymbol(filePath, 'local', name, child));
    }
  }
}

export function handleGoQualifiedTypeReference(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  importedBindings: ReadonlyMap<string, ImportedBinding>,
  currentSymbolId?: string,
): void {
  const binding = getGoQualifiedTypeBinding(node, importedBindings);
  if (binding) {
    addReferenceRelation(relations, filePath, node.text, binding.resolvedPath, currentSymbolId);
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
