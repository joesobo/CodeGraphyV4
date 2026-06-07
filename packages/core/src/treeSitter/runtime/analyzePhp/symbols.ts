import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
} from '@codegraphy-dev/plugin-api';
import type { ImportedBinding, SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { addInheritRelation, createSymbol } from '../analyze/results';
import { resolvePhpReferencePath } from './references';
import { getClauseTypeNames, getPhpTypeKind } from './typeDeclarations';

export function handlePhpTypeDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  sourceRoot: string | null,
  namespaceName: string | null,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  importedBindings: ReadonlyMap<string, ImportedBinding>,
  symbolsEnabled: boolean,
): void {
  const name = node.childForFieldName('name')?.text;
  if (name && symbolsEnabled) {
    symbols.push(createSymbol(filePath, getPhpTypeKind(node), name, node));
  }

  for (const typeName of [
    ...getClauseTypeNames(node, 'base_clause'),
    ...getClauseTypeNames(node, 'class_interface_clause'),
  ]) {
    addInheritRelation(
      relations,
      filePath,
      typeName,
      resolvePhpReferencePath(sourceRoot, namespaceName, importedBindings, typeName),
    );
  }
}

export function handlePhpFunctionDefinition(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): TreeWalkAction<SymbolWalkState> {
  const name = node.childForFieldName('name')?.text;
  if (name) {
    symbols.push(createSymbol(filePath, 'function', name, node));
  }

  return { skipChildren: true };
}

export function handlePhpMethodDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): TreeWalkAction<SymbolWalkState> {
  const name = node.childForFieldName('name')?.text;
  if (name) {
    symbols.push(createSymbol(filePath, 'method', name, node));
  }

  return { skipChildren: true };
}
