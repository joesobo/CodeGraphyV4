import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
} from '@codegraphy-dev/plugin-api';
import type { ImportedBinding, SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { addInheritRelation, createSymbol } from '../analyze/results';

function isInsideRubyClass(node: Parser.SyntaxNode): boolean {
  let current = node.parent;

  while (current) {
    if (current.type === 'class' || current.type === 'singleton_class') {
      return true;
    }

    current = current.parent;
  }

  return false;
}

function addNamedSymbol(
  symbols: IAnalysisSymbol[],
  filePath: string,
  kind: string,
  node: Parser.SyntaxNode,
): void {
  const name = node.childForFieldName('name')?.text;
  if (name) {
    symbols.push(createSymbol(filePath, kind, name, node));
  }
}

export function handleRubyModule(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): void {
  addNamedSymbol(symbols, filePath, 'module', node);
}

export function handleRubyClass(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  importedBindings: ReadonlyMap<string, ImportedBinding>,
): void {
  addNamedSymbol(symbols, filePath, 'class', node);

  const superclass = node.childForFieldName('superclass')?.descendantsOfType('constant')[0]?.text;
  if (!superclass) {
    return;
  }

  addInheritRelation(
    relations,
    filePath,
    superclass,
    importedBindings.get(superclass)?.resolvedPath ?? null,
  );
}

export function handleRubyMethod(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): TreeWalkAction<SymbolWalkState> {
  const name = node.childForFieldName('name')?.text;
  if (name) {
    symbols.push(createSymbol(filePath, isInsideRubyClass(node) ? 'method' : 'function', name, node));
  }

  return { skipChildren: true };
}
