import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
} from '@codegraphy-dev/plugin-api';
import { resolveJavaTypePath } from '../projectRoots';
import type { ImportedBinding } from '../analyze/model';
import { getIdentifierText } from '../analyze/nodes';
import { addRelation, createSymbol, createSymbolId } from '../analyze/results';
import { TREE_SITTER_SOURCE_IDS } from '../languages';

interface JavaExtendsType {
  specifier: string;
  symbolName: string;
}

function getJavaTypeDeclarationKind(node: Parser.SyntaxNode): 'interface' | 'enum' | 'class' {
  if (node.type === 'interface_declaration') {
    return 'interface';
  }

  if (node.type === 'enum_declaration') {
    return 'enum';
  }

  return 'class';
}

export function handleJavaTypeDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  sourceRoot: string | null,
  packageName: string | null,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  importedBindings: ReadonlyMap<string, ImportedBinding>,
): void {
  const name = getIdentifierText(node.childForFieldName('name'));
  if (!name) {
    return;
  }

  const symbol = createSymbol(filePath, getJavaTypeDeclarationKind(node), name, node);
  symbols.push(symbol);

  if (node.type !== 'class_declaration') {
    return;
  }

  const extendsType = getJavaExtendsType(node);
  if (!extendsType) {
    return;
  }

  const resolvedPath = resolveJavaReferencePath(
    sourceRoot,
    packageName,
    importedBindings,
    extendsType.specifier,
  );

  addRelation(relations, {
    kind: 'inherit',
    sourceId: TREE_SITTER_SOURCE_IDS.inherit,
    fromFilePath: filePath,
    fromSymbolId: symbol.id,
    specifier: extendsType.specifier,
    ...(resolvedPath ? { toSymbolId: createSymbolId(resolvedPath, 'class', extendsType.symbolName) } : {}),
  });
}

function getJavaExtendsType(node: Parser.SyntaxNode): JavaExtendsType | null {
  const superclass = node.childForFieldName('superclass');
  if (!superclass) {
    return null;
  }

  const typeNode = superclass.namedChildren[0];
  if (!typeNode) {
    return null;
  }

  if (typeNode.type === 'scoped_type_identifier') {
    const symbolName = getLastTypeIdentifier(typeNode);
    return symbolName ? { specifier: typeNode.text, symbolName } : null;
  }

  const typeIdentifier = typeNode.type === 'generic_type'
    ? typeNode.descendantsOfType('type_identifier')[0]
    : typeNode;
  const symbolName = getIdentifierText(typeIdentifier);
  return symbolName ? { specifier: symbolName, symbolName } : null;
}

function getLastTypeIdentifier(node: Parser.SyntaxNode): string | null {
  const identifiers = node.descendantsOfType('type_identifier');
  return getIdentifierText(identifiers.at(-1));
}

function resolveJavaReferencePath(
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
    return resolveJavaTypePath(sourceRoot, typeName);
  }

  return packageName
    ? resolveJavaTypePath(sourceRoot, `${packageName}.${typeName}`)
    : null;
}
