import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
} from '@codegraphy-dev/plugin-api';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { addInheritRelation, createSymbol } from '../analyze/results';
import {
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
  if (node.type === 'mixin_declaration') {
    addDartNamedSymbol(symbols, filePath, 'mixin', node);
    return;
  }

  addDartNamedSymbol(symbols, filePath, 'enum', node);
}

export function handleDartFunctionSignature(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): TreeWalkAction<SymbolWalkState> {
  const signature = getDartFunctionSignature(node);
  const name = signature ? getDartDeclarationName(signature) : null;
  if (name) {
    symbols.push(createSymbol(
      filePath,
      node.type === 'method_signature' ? 'method' : 'function',
      name,
      node,
    ));
  }

  return { skipChildren: true };
}
