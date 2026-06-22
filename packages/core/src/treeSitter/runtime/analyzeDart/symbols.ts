import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
} from '@codegraphy-dev/plugin-api';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { addInheritRelation, createSymbol } from '../analyze/results';
import {
  addDartIdentifierSymbol,
  addDartNamedSymbol,
  getDartDeclarationName,
  getDartFunctionSignature,
} from './declarations';

export function handleDartClassDefinition(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  symbolsEnabled: boolean,
  importedTypePaths: ReadonlyMap<string, string | null>,
): void {
  if (symbolsEnabled) {
    addDartNamedSymbol(symbols, filePath, 'class', node);
  }

  for (const typeName of readDartInheritedTypeNames(node)) {
    addInheritRelation(relations, filePath, typeName, importedTypePaths.get(typeName) ?? null);
  }
}

function readDartInheritedTypeNames(node: Parser.SyntaxNode): string[] {
  const superclass = node.childForFieldName('superclass');
  const names = new Set<string>(
    superclass?.descendantsOfType('type_identifier').map(typeIdentifier => typeIdentifier.text) ?? [],
  );

  for (const pattern of [
    /\bextends\s+([A-Za-z_]\w*)/g,
    /\bwith\s+([^{]+)/g,
    /\bimplements\s+([^{]+)/g,
  ]) {
    for (const match of node.text.matchAll(pattern)) {
      for (const entry of match[1].split(',')) {
        const typeName = entry.trim().match(/^([A-Za-z_]\w*)/)?.[1];
        if (typeName) {
          names.add(typeName);
        }
      }
    }
  }

  return [...names];
}

export function handleDartTypeDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): void {
  const kindByNodeType: Record<string, string> = {
    enum_declaration: 'enum',
    extension_declaration: 'extension',
    mixin_declaration: 'mixin',
    type_alias: 'alias',
  };
  const kind = kindByNodeType[node.type];
  if (kind) {
    addDartNamedSymbol(symbols, filePath, kind, node);
  }
}

export function handleDartFunctionSignature(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): TreeWalkAction<SymbolWalkState> {
  const signature = getDartFunctionSignature(node);
  const name = signature ? getDartDeclarationName(signature) : null;
  if (signature && name && !isDartGetterSignature(signature)) {
    symbols.push(createSymbol(
      filePath,
      isDartMethodSignatureNode(node) ? 'method' : 'function',
      name,
      node,
    ));
  }

  return { skipChildren: true };
}

export function handleDartLocalDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): void {
  for (const declaration of node.descendantsOfType('initialized_variable_definition')) {
    const identifier = declaration.namedChildren.find((child) => child.type === 'identifier');
    if (identifier) {
      addDartIdentifierSymbol(symbols, filePath, 'local', identifier);
    }
  }
}

export function handleDartConstantDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): void {
  for (const declaration of node.descendantsOfType('static_final_declaration')) {
    const identifier = declaration.namedChildren.find((child) => child.type === 'identifier');
    if (identifier && isConstDeclarationList(node)) {
      addDartIdentifierSymbol(symbols, filePath, 'constant', identifier);
    }
  }
}

function isDartGetterSignature(node: Parser.SyntaxNode): boolean {
  return /\bget\s+[A-Za-z_]\w*/u.test(node.text);
}

function isDartMethodSignatureNode(node: Parser.SyntaxNode): boolean {
  if (node.type === 'method_signature') {
    return true;
  }

  for (let current: Parser.SyntaxNode | null = node.parent; current; current = current.parent) {
    if (
      current.type === 'class_definition'
      || current.type === 'extension_declaration'
      || current.type === 'mixin_declaration'
    ) {
      return true;
    }
  }

  return false;
}

function isConstDeclarationList(node: Parser.SyntaxNode): boolean {
  const declarationText = node.parent?.text ?? node.text;
  return /\bconst\b/u.test(declarationText);
}
