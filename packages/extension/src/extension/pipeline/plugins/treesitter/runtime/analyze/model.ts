import type Parser from 'tree-sitter';

export interface ImportedBinding {
  bindingKind?: 'default' | 'module' | 'named' | 'namespace';
  importedName?: string;
  localName?: string;
  memberName?: string;
  resolvedPath: string | null;
  specifier: string;
}

export interface TreeWalkAction<TContext> {
  nextContext?: TContext;
  skipChildren?: boolean;
}

export interface SymbolWalkState {
  currentSymbolId?: string;
}

export type TreeWalkVisitor<TContext> = (
  node: Parser.SyntaxNode,
  context: TContext,
  walk: (node: Parser.SyntaxNode, context: TContext) => void,
) => TreeWalkAction<TContext> | void;
