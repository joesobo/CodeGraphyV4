import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import { addInheritRelation } from '../analyze/results';
import type { CppIncludedDeclarations } from './relationModel';
import { readCppTypeName } from './relationTypeNames';

export function addCppInheritRelations(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  includedDeclarations: CppIncludedDeclarations,
  sourceSymbolId: string | undefined,
): Array<string | null> {
  return readCppBaseTypeNames(node).map((baseName) => {
    const targetPath = resolveCppInheritedTypePath(includedDeclarations, baseName);
    addInheritRelation(relations, filePath, baseName, targetPath, sourceSymbolId);
    return targetPath;
  });
}

function readCppBaseTypeNames(typeNode: Parser.SyntaxNode): string[] {
  const baseClause = typeNode.namedChildren.find((child) => child.type === 'base_class_clause');
  if (!baseClause) {
    return [];
  }

  return baseClause.namedChildren
    .map(readCppTypeName)
    .filter((typeName): typeName is string => Boolean(typeName));
}

function resolveCppInheritedTypePath(
  includedDeclarations: CppIncludedDeclarations,
  typeName: string,
): string | null {
  const resolvedPath = includedDeclarations.typePathByName.get(typeName);
  return resolvedPath ?? null;
}
