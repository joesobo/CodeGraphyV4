import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
} from '@codegraphy-dev/plugin-api';
import type { ImportedBinding } from '../analyze/model';
import { getIdentifierText } from '../analyze/nodes';
import { addInheritRelation, createSymbol } from '../analyze/results';
import { resolveJavaTypePath } from '../projectRoots';

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
  symbolsEnabled: boolean,
): void {
  const name = getIdentifierText(node.childForFieldName('name'));
  if (!name) {
    return;
  }

  const symbol = symbolsEnabled ? createSymbol(filePath, getJavaTypeDeclarationKind(node), name, node) : undefined;
  if (symbol) {
    symbols.push(symbol);
  }

  if (node.type === 'enum_declaration') {
    return;
  }

  for (const typeName of readJavaInheritedTypeNames(node.text)) {
    addInheritRelation(
      relations,
      filePath,
      typeName,
      resolveJavaInheritedTypePath(sourceRoot, packageName, importedBindings, typeName),
      symbol?.id,
    );
  }
}

function readJavaInheritedTypeNames(source: string): string[] {
  return [
    ...readSingleClauseNames(source, /\bextends\s+([A-Za-z_]\w*)/g),
    ...readListClauseNames(source, /\bimplements\s+([^{]+)/g),
  ];
}

function readSingleClauseNames(source: string, pattern: RegExp): string[] {
  return Array.from(source.matchAll(pattern), match => match[1]).filter(Boolean);
}

function readListClauseNames(source: string, pattern: RegExp): string[] {
  return Array.from(source.matchAll(pattern))
    .flatMap(match => match[1].split(','))
    .map((entry) => entry.trim().match(/^([A-Za-z_]\w*)/)?.[1] ?? null)
    .filter((name): name is string => Boolean(name));
}

function resolveJavaInheritedTypePath(
  sourceRoot: string | null,
  packageName: string | null,
  importedBindings: ReadonlyMap<string, ImportedBinding>,
  typeName: string,
): string | null {
  const importedPath = importedBindings.get(typeName)?.resolvedPath;
  if (importedPath !== undefined) {
    return importedPath;
  }

  if (!sourceRoot || !packageName) {
    return null;
  }

  return resolveJavaTypePath(sourceRoot, `${packageName}.${typeName}`);
}
