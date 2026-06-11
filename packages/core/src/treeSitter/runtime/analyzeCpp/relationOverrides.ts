import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import {
  addOverrideRelation,
} from '../analyze/results';
import type {
  CppIncludedDeclarations,
} from './relationModel';
import { readCppOverrideMethods } from './relationOverrideMethods';
import {
  readCppOverrideSourceSymbolId,
  resolveCppOverridePath,
  resolveCppOverrideSymbolId,
} from './relationOverrideResolution';

export function addCppOverrideRelations(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  includedDeclarations: CppIncludedDeclarations,
  inheritedTypePaths: ReadonlyArray<string | null>,
  symbols: { symbolsEnabled: boolean; typeName: string | undefined },
): void {
  for (const method of readCppOverrideMethods(node)) {
    const targetPath = resolveCppOverridePath(includedDeclarations, inheritedTypePaths, method.methodName);
    addOverrideRelation(
      relations,
      filePath,
      method.methodName,
      targetPath,
      readCppOverrideSourceSymbolId(filePath, method, symbols),
      resolveCppOverrideSymbolId(includedDeclarations, targetPath, method.methodName),
    );
  }
}
