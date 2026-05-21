import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
} from '@codegraphy-dev/plugin-api';
import type { ImportedBinding, SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { addInheritRelation, createSymbol } from '../analyze/results';
import { resolvePhpTypePath } from '../projectRoots/php';

function getPhpTypeKind(node: Parser.SyntaxNode): 'class' | 'enum' | 'interface' | 'trait' {
  switch (node.type) {
    case 'interface_declaration':
      return 'interface';
    case 'trait_declaration':
      return 'trait';
    case 'enum_declaration':
      return 'enum';
    default:
      return 'class';
  }
}

function resolvePhpReferencePath(
  sourceRoot: string | null,
  namespaceName: string | null,
  importedBindings: ReadonlyMap<string, ImportedBinding>,
  typeName: string,
): string | null {
  const importedBinding = importedBindings.get(typeName);
  if (importedBinding?.resolvedPath) {
    return importedBinding.resolvedPath;
  }

  if (typeName.includes('\\')) {
    return resolvePhpTypePath(sourceRoot, typeName);
  }

  return namespaceName
    ? resolvePhpTypePath(sourceRoot, `${namespaceName}\\${typeName}`)
    : null;
}

function getClauseTypeNames(node: Parser.SyntaxNode, clauseType: string): string[] {
  return node.namedChildren
    .filter((child) => child.type === clauseType)
    .flatMap((clause) => clause.namedChildren)
    .filter((child) => child.type === 'name' || child.type === 'qualified_name')
    .map((child) => child.text);
}

export function handlePhpTypeDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  sourceRoot: string | null,
  namespaceName: string | null,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  importedBindings: ReadonlyMap<string, ImportedBinding>,
): void {
  const name = node.childForFieldName('name')?.text;
  if (name) {
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
