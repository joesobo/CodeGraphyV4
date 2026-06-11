import type Parser from 'tree-sitter';
import { createSymbolId } from '../analyze/results';
import {
  readCppDeclaredFunctionNames,
  readCppDefinedFunctionNames,
} from './relationDeclaredFunctions';
import {
  readCppDeclaredMethodNames,
  readCppDeclaredMethodSymbols,
} from './relationDeclaredMethods';
import { readCppDeclaredTypeNames } from './relationDeclaredTypes';
import type { MutableCppIncludedDeclarations } from './relationModel';

export function collectCppDeclarations(
  rootNode: Parser.SyntaxNode,
  filePath: string,
  declarations: MutableCppIncludedDeclarations,
  options: { exposeMethodsAsCallTargets: boolean },
): void {
  collectCppTypeDeclarations(rootNode, filePath, declarations);
  collectCppMethodDeclarations(rootNode, filePath, declarations, options);
  collectCppFunctionDeclarations(rootNode, filePath, declarations);
}

function collectCppTypeDeclarations(
  rootNode: Parser.SyntaxNode,
  filePath: string,
  declarations: MutableCppIncludedDeclarations,
): void {
  for (const typeName of readCppDeclaredTypeNames(rootNode)) {
    setFirstPath(declarations.typePathByName, typeName, filePath);
  }
}

function collectCppMethodDeclarations(
  rootNode: Parser.SyntaxNode,
  filePath: string,
  declarations: MutableCppIncludedDeclarations,
  options: { exposeMethodsAsCallTargets: boolean },
): void {
  for (const methodName of readCppDeclaredMethodNames(rootNode)) {
    setFirstPath(declarations.methodPathByName, methodName, filePath);
    if (options.exposeMethodsAsCallTargets) {
      setFirstPath(declarations.methodCallPathByName, methodName, filePath);
    }
  }

  for (const method of readCppDeclaredMethodSymbols(rootNode)) {
    setFirstSymbolId(
      declarations.methodSymbolIdByName,
      method.methodName,
      createSymbolId(filePath, 'method', method.symbolName),
    );
  }
}

function collectCppFunctionDeclarations(
  rootNode: Parser.SyntaxNode,
  filePath: string,
  declarations: MutableCppIncludedDeclarations,
): void {
  for (const functionName of readCppDeclaredFunctionNames(rootNode)) {
    setFirstPath(declarations.functionPathByName, functionName, filePath);
  }

  for (const functionName of readCppDefinedFunctionNames(rootNode)) {
    setFirstSymbolId(
      declarations.functionSymbolIdByName,
      functionName,
      createSymbolId(filePath, 'function', functionName),
    );
  }
}

function setFirstPath(pathsByName: Map<string, string | null>, name: string, filePath: string): void {
  if (!pathsByName.has(name)) {
    pathsByName.set(name, filePath);
  }
}

function setFirstSymbolId(symbolIdsByName: Map<string, string>, name: string, symbolId: string): void {
  if (!symbolIdsByName.has(name)) {
    symbolIdsByName.set(name, symbolId);
  }
}
