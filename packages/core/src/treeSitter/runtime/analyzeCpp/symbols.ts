import type Parser from 'tree-sitter';
import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import type { TreeWalkAction } from '../analyze/model';
import { handleCppFunctionDefinition } from './symbolCallables';
import {
  handleCppAliasDeclaration,
  handleCppCFamilySymbol,
  handleCppTemplateDeclaration,
  handleCppTypeDeclaration,
} from './symbolTypes';
import {
  handleCppDeclaration,
  handleCppFieldDeclaration,
  handleCppForRangeLoop,
  handleCppParameterDeclaration,
} from './symbolVariables';
import type {
  CppSymbolHandler,
  CppSymbolWalkState,
} from './symbolModel';

const CPP_SYMBOL_HANDLERS: Readonly<Record<string, CppSymbolHandler>> = {
  alias_declaration: handleCppAliasDeclaration,
  class_specifier: handleCppTypeDeclaration,
  declaration: handleCppDeclaration,
  enum_specifier: handleCppCFamilySymbol,
  field_declaration: handleCppFieldDeclaration,
  for_range_loop: handleCppForRangeLoop,
  function_definition: handleCppFunctionDefinition,
  namespace_definition: handleCppCFamilySymbol,
  parameter_declaration: handleCppParameterDeclaration,
  struct_specifier: handleCppTypeDeclaration,
  template_declaration: handleCppTemplateDeclaration,
  union_specifier: handleCppTypeDeclaration,
};

export function handleCppSymbol(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  state: CppSymbolWalkState,
): TreeWalkAction<CppSymbolWalkState> | void {
  return CPP_SYMBOL_HANDLERS[node.type]?.(node, filePath, symbols, state);
}

export type { CppSymbolWalkState };
