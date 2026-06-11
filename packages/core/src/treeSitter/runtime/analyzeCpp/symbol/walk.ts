import type Parser from 'tree-sitter';
import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import type { TreeWalkAction } from '../../analyze/model';
import { handleCppFunctionDefinition } from './callables';
import {
  handleCppAliasDeclaration,
  handleCppCFamilySymbol,
  handleCppTemplateDeclaration,
  handleCppTypeDeclaration,
} from './type/declaration';
import { handleCppDeclaration } from './variable/declaration';
import { handleCppFieldDeclaration } from './variable/field';
import { handleCppForRangeLoop } from './variable/loop';
import { handleCppParameterDeclaration } from './variable/parameter';
import type {
  CppSymbolHandler,
  CppSymbolWalkState,
} from './model';

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
