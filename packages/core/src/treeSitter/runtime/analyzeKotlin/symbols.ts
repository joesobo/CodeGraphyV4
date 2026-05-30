import type Parser from 'tree-sitter';
import type {
  IAnalysisRelationshipEvidence,
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
  relations: IAnalysisRelationshipEvidence[],
  symbols: IAnalysisSymbol[],
  importedBindings: ReadonlyMap<string, ImportedBinding>,
): void {
  const name = getIdentifierText(node.childForFieldName('name'));
  if (name) {
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
): TreeWalkAction<SymbolWalkState> {
  const name = getIdentifierText(node.childForFieldName('name'));
  if (name) {
    const kind = isInsideKotlinType(node) ? 'method' : 'function';
    symbols.push(createSymbol(filePath, kind, name, node));
  }

  return { skipChildren: true };
}
