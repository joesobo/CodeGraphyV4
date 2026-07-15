import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import type { ImportedBinding, SymbolWalkState } from '../analyze/model';
import { handleGoCallExpression, handleGoQualifiedTypeReference } from './handlers';

export function visitGoReferenceNode(
  node: Parser.SyntaxNode,
  state: SymbolWalkState,
  filePath: string,
  relations: IAnalysisRelation[],
  importedBindings: Map<string, ImportedBinding>,
  receiverBindings: Map<string, ImportedBinding>,
): void {
  if (node.type === 'qualified_type') {
    handleGoQualifiedTypeReference(node, filePath, relations, importedBindings, state.currentSymbolId);
  } else if (node.type === 'call_expression') {
    handleGoCallExpression(node, filePath, relations, importedBindings, receiverBindings, state.currentSymbolId);
  }
}
