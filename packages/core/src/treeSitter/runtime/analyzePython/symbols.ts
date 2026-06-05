import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
} from '@codegraphy-dev/plugin-api';
import { getImportedBindingByIdentifier, getImportedBindingByPropertyAccess } from '../analyze/imports';
import type { ImportedBinding, SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { getIdentifierText } from '../analyze/nodes';
import { addCallRelation, addInheritRelation, createSymbol } from '../analyze/results';
import { walkSymbolBody } from '../analyze/walk';

function getPythonCallBinding(
  callExpression: Parser.SyntaxNode,
  importedBindings: ReadonlyMap<string, ImportedBinding>,
): ImportedBinding | null {
  const calleeNode = callExpression.childForFieldName('function') ?? callExpression.namedChildren[0];
  return (
    getImportedBindingByIdentifier(calleeNode, importedBindings)
    ?? getImportedBindingByPropertyAccess(calleeNode, importedBindings, 'attribute', 'object', 'attribute')
  );
}

export function handlePythonClassDefinition(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  importedBindings: ReadonlyMap<string, ImportedBinding>,
  symbolsEnabled: boolean,
): void {
  const name = getIdentifierText(node.childForFieldName('name'));
  const symbol = name && symbolsEnabled ? createSymbol(filePath, 'class', name, node) : undefined;
  if (symbol) {
    symbols.push(symbol);
  }

  for (const baseName of readPythonBaseClassNames(node.text)) {
    addInheritRelation(
      relations,
      filePath,
      baseName,
      importedBindings.get(baseName)?.resolvedPath ?? null,
      symbol?.id,
    );
  }
}

function readPythonBaseClassNames(source: string): string[] {
  const clause = source.match(/\bclass\s+[A-Za-z_]\w*\s*\(([^)]*)\)/)?.[1];
  if (!clause) {
    return [];
  }

  return clause
    .split(',')
    .map((entry) => entry.trim().match(/^([A-Za-z_]\w*)/)?.[1] ?? null)
    .filter((name): name is string => Boolean(name));
}

export function handlePythonFunctionDefinition(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  walk: (node: Parser.SyntaxNode, context: SymbolWalkState) => void,
): TreeWalkAction<SymbolWalkState> | void {
  const name = getIdentifierText(node.childForFieldName('name'));
  if (!name) {
    return;
  }

  const kind = node.parent?.type === 'block' && node.parent.parent?.type === 'class_definition'
    ? 'method'
    : 'function';
  const symbol = createSymbol(filePath, kind, name, node);
  symbols.push(symbol);
  return walkSymbolBody(node, symbol.id, walk);
}

export function handlePythonCall(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  importedBindings: ReadonlyMap<string, ImportedBinding>,
  currentSymbolId?: string,
): void {
  const binding = getPythonCallBinding(node, importedBindings);
  if (binding) {
    addCallRelation(relations, filePath, binding, currentSymbolId);
  }
}
