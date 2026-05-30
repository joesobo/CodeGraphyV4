import type Parser from 'tree-sitter';
import type {
  IAnalysisRelationshipEvidence,
  IAnalysisSymbol,
} from '@codegraphy-dev/plugin-api';
import type { ImportedBinding, SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { getIdentifierText } from '../analyze/nodes';
import { addCallRelation, createSymbol } from '../analyze/results';
import { walkSymbolBody } from '../analyze/walk';

export function handleJavaMethodDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  walk: (node: Parser.SyntaxNode, context: SymbolWalkState) => void,
): TreeWalkAction<SymbolWalkState> | void {
  const name = getIdentifierText(node.childForFieldName('name'));
  if (!name) {
    return;
  }

  const symbol = createSymbol(filePath, 'method', name, node);
  symbols.push(symbol);
  return walkSymbolBody(node, symbol.id, walk);
}

export function handleJavaMethodInvocation(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelationshipEvidence[],
  importedBindings: ReadonlyMap<string, ImportedBinding>,
  currentSymbolId?: string,
): void {
  const objectNode = node.childForFieldName('object');
  const objectIdentifier = getIdentifierText(objectNode);
  const binding = objectIdentifier ? importedBindings.get(objectIdentifier) ?? null : null;
  if (binding) {
    addCallRelation(relations, filePath, binding, currentSymbolId);
  }
}
