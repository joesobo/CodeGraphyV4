import type Parser from 'tree-sitter';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import type { DartVisitContext } from './visitContext';
import { visitDartBody } from './visitBody';
import { visitDartImport } from './visitImport';
import { visitDartReference } from './visitReference';
import { visitDartSignature } from './visitSignature';
import { isDartTypeDeclaration, visitDartTypeDeclaration } from './visitTypeDeclaration';

export function visitDartNode(
  node: Parser.SyntaxNode,
  state: SymbolWalkState,
  context: DartVisitContext,
): TreeWalkAction<SymbolWalkState> | void {
  if (node.type === 'library_import') return visitDartImport(node, context);
  if (isDartTypeDeclaration(node)) return visitDartTypeDeclaration(node, state, context);
  const signatureAction = visitDartSignature(node, context);
  if (signatureAction.handled) return signatureAction.action;
  const bodyAction = visitDartBody(node, context);
  if (bodyAction) return bodyAction;
  visitDartReference(node, state, context);
}
