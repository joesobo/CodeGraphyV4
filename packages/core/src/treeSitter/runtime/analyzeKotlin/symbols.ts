import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
} from '@codegraphy/plugin-api';
import type { ImportedBinding, SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { getIdentifierText } from '../analyze/nodes';
import { addInheritRelation, createSymbol } from '../analyze/results';
import { resolveKotlinTypePath } from '../projectRoots/kotlin';

function getKotlinTypeKind(node: Parser.SyntaxNode): 'enum' | 'interface' | 'class' {
  const declarationText = node.text.trimStart();
  if (declarationText.startsWith('interface ')) {
    return 'interface';
  }

  if (declarationText.startsWith('enum class ')) {
    return 'enum';
  }

  return 'class';
}

function resolveKotlinReferencePath(
  sourceRoot: string | null,
  packageName: string | null,
  importedBindings: ReadonlyMap<string, ImportedBinding>,
  typeName: string,
): string | null {
  const importedBinding = importedBindings.get(typeName);
  if (importedBinding?.resolvedPath) {
    return importedBinding.resolvedPath;
  }

  if (typeName.includes('.')) {
    return resolveKotlinTypePath(sourceRoot, typeName);
  }

  return packageName
    ? resolveKotlinTypePath(sourceRoot, `${packageName}.${typeName}`)
    : null;
}

function isInsideKotlinType(node: Parser.SyntaxNode): boolean {
  let current = node.parent;

  while (current) {
    if (current.type === 'class_declaration' || current.type === 'object_declaration') {
      return true;
    }

    current = current.parent;
  }

  return false;
}

function getDelegatedTypeNames(node: Parser.SyntaxNode): string[] {
  const delegationSpecifiers = node.namedChildren.find((child) =>
    child.type === 'delegation_specifiers',
  );
  if (!delegationSpecifiers) {
    return [];
  }

  return delegationSpecifiers.descendantsOfType('user_type')
    .map((typeNode) => typeNode.namedChildren.find((child) => child.type === 'identifier')?.text)
    .filter((typeName): typeName is string => Boolean(typeName));
}

export function handleKotlinTypeDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  sourceRoot: string | null,
  packageName: string | null,
  relations: IAnalysisRelation[],
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
