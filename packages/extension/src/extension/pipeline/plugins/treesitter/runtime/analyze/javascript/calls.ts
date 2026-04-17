import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '../../../../../../../core/plugins/types/contracts';
import { getImportedBindingByIdentifier, getImportedBindingByPropertyAccess } from '../imports';
import { getImportRelationForJavaScriptCallExpression } from './callImports';
import type { ImportedBinding } from '../model';
import { addCallRelation } from '../results';

function getImportedBindingForJavaScriptCall(
  callExpression: Parser.SyntaxNode,
  importedBindings: ReadonlyMap<string, ImportedBinding>,
): ImportedBinding | null {
  const calleeNode = callExpression.childForFieldName('function') ?? callExpression.namedChildren[0];
  return (
    getImportedBindingByIdentifier(calleeNode, importedBindings)
    ?? getImportedBindingByPropertyAccess(calleeNode, importedBindings, 'member_expression', 'object')
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
