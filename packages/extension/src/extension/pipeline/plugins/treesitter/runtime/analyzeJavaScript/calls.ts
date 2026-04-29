import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '../../../../../../core/plugins/types/contracts';
import { getImportedBindingByIdentifier, getImportedBindingByPropertyAccess } from '../analyze/imports';
import { getImportRelationForJavaScriptCallExpression } from './callImports';
import type { ImportedBinding } from '../analyze/model';
import { addCallRelation } from '../analyze/results';

function getImportedBindingForJavaScriptCall(
  callExpression: Parser.SyntaxNode,
  importedBindings: ReadonlyMap<string, ImportedBinding>,
): ImportedBinding | null {
  const calleeNode = callExpression.childForFieldName('function') ?? callExpression.namedChildren[0];
  return (
    getImportedBindingByIdentifier(calleeNode, importedBindings)
    ?? getImportedBindingByPropertyAccess(calleeNode, importedBindings, 'member_expression', 'object', 'property')
  );
}

export function handleJavaScriptCallExpression(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  importedBindings: ReadonlyMap<string, ImportedBinding>,
  currentSymbolId?: string,
): void {
  const importRelation = getImportRelationForJavaScriptCallExpression(node, filePath);
  if (importRelation) {
    relations.push(importRelation);
    return;
  }

  const binding = getImportedBindingForJavaScriptCall(node, importedBindings);
  if (binding) {
    addCallRelation(relations, filePath, binding, currentSymbolId);
  }
}
