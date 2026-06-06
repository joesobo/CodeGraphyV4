import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
} from '@codegraphy-dev/plugin-api';
import type { ImportedBinding, SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { getIdentifierText } from '../analyze/nodes';
import { addInheritRelation, createSymbol } from '../analyze/results';
import { resolveKotlinReferencePath } from './references';
import { getDelegatedTypeNames, getKotlinTypeKind, isInsideKotlinType } from './typeDeclarations';

export function handleKotlinTypeDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  sourceRoot: string | null,
  packageName: string | null,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  importedBindings: ReadonlyMap<string, ImportedBinding>,
  symbolsEnabled: boolean,
): void {
  const name = getIdentifierText(node.childForFieldName('name'));
  if (name && symbolsEnabled) {
    symbols.push(createSymbol(filePath, getKotlinTypeKind(node), name, node));
  }

  for (const typeName of getDelegatedTypeNames(node)) {
    addInheritRelation(
      relations,
      filePath,
      typeName,
      resolveKotlinReferencePath(sourceRoot, packageName, importedBindings, typeName),
    );
  }
}

export function handleKotlinObjectDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): void {
  const name = getIdentifierText(node.childForFieldName('name'));
  if (name) {
    symbols.push(createSymbol(filePath, 'object', name, node));
  }
}

export function handleKotlinFunctionDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): TreeWalkAction<SymbolWalkState> | void {
  const name = getIdentifierText(node.childForFieldName('name'));
  if (name) {
    const kind = isInsideKotlinType(node) ? 'method' : 'function';
    const symbol = createSymbol(filePath, kind, name, node);
    symbols.push(symbol);
    return { nextContext: { currentSymbolId: symbol.id } };
  }

  return;
}
