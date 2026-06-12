export const CPP_TYPE_NODE_TYPES = new Set(['class_specifier', 'struct_specifier', 'union_specifier']);

export interface CppIncludedDeclarations {
  functionPathByName: ReadonlyMap<string, string | null>;
  functionSymbolIdByName: ReadonlyMap<string, string>;
  methodCallPathByName: ReadonlyMap<string, string | null>;
  methodSymbolIdByName: ReadonlyMap<string, string>;
  methodPathByName: ReadonlyMap<string, string | null>;
  typePathByName: ReadonlyMap<string, string | null>;
}

export interface MutableCppIncludedDeclarations {
  functionPathByName: Map<string, string | null>;
  functionSymbolIdByName: Map<string, string>;
  methodCallPathByName: Map<string, string | null>;
  methodSymbolIdByName: Map<string, string>;
  methodPathByName: Map<string, string | null>;
  typePathByName: Map<string, string | null>;
}

export interface CppResolvedDeclaration {
  filePath: string;
  symbolId?: string;
}

export interface CppOverrideMethod {
  methodName: string;
  sourceSymbolKind: 'class' | 'method';
}
