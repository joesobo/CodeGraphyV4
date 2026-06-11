import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import { createSymbolId } from '../analyze/results';
import type { CppIncludedDeclarations } from './relationModel';
import { addCppInheritRelations } from './relationInheritance';
import { addCppOverrideRelations } from './relationOverrides';

export function addCppTypeRelations(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  includedDeclarations: CppIncludedDeclarations,
  symbolsEnabled: boolean,
): void {
  const typeName = node.childForFieldName('name')?.text;
  const inheritedTypePaths = addCppInheritRelations(
    node,
    filePath,
    relations,
    includedDeclarations,
    symbolsEnabled && typeName ? createSymbolId(filePath, readCppTypeKind(node), typeName) : undefined,
  );

  addCppOverrideRelations(node, filePath, relations, includedDeclarations, inheritedTypePaths, {
    symbolsEnabled,
    typeName,
  });
}

function readCppTypeKind(node: Parser.SyntaxNode): 'class' | 'struct' | 'union' {
  if (node.type === 'union_specifier') {
    return 'union';
  }

  return node.type === 'struct_specifier' ? 'struct' : 'class';
}
