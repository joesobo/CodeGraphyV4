import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import type { ImportedBinding } from '../analyze/model';
import {
  addCallRelation,
  createSymbolId,
} from '../analyze/results';
import type { CppIncludedDeclarations } from './relationModel';
import { readCppCallName } from './relationCallNames';
import { resolveCppCallTarget } from './relationCallTargets';
import {
  isCppMethodDefinition,
  readCppFunctionSymbolName,
} from './relationFunctionNames';

export function addCppCallRelation(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  includedDeclarations: CppIncludedDeclarations,
  symbolsEnabled: boolean,
): void {
  const calleeName = readCppCallName(node);
  const target = calleeName ? resolveCppCallTarget(includedDeclarations, calleeName) : null;
  if (!calleeName || !target) {
    return;
  }

  addCallRelation(
    relations,
    filePath,
    createCppCallBinding(calleeName, target.filePath),
    symbolsEnabled ? readCppEnclosingFunctionSymbolId(node, filePath) : undefined,
    target.symbolId,
    calleeName,
  );
}

function readCppEnclosingFunctionSymbolId(node: Parser.SyntaxNode, filePath: string): string | undefined {
  let current: Parser.SyntaxNode | null = node.parent;
  while (current) {
    if (current.type === 'function_definition') {
      const functionName = readCppFunctionSymbolName(current);
      if (!functionName) {
        return undefined;
      }

      const symbolKind = isCppMethodDefinition(current) ? 'method' : 'function';
      return createSymbolId(filePath, symbolKind, functionName);
    }

    current = current.parent;
  }

  return undefined;
}

function createCppCallBinding(calleeName: string, targetPath: string): ImportedBinding {
  return {
    specifier: calleeName,
    resolvedPath: targetPath,
    bindingKind: 'named',
    importedName: calleeName,
    localName: calleeName,
    memberName: calleeName,
  };
}
