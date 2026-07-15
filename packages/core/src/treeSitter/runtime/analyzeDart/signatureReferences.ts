import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import { handleDartTypeReference } from './typeReferences';
import { isDartAbstractInterfaceMemberSignature } from './abstractSignature';
import {
  shouldSkipDartConcreteMethodReturnType,
} from './signaturePredicates';

export function addDartSignatureReferenceRelations(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  symbolPaths: ReadonlyMap<string, string | null>,
  currentSymbolId?: string,
): void {
  if (isDartAbstractInterfaceMemberSignature(node)) return;
  for (const typeIdentifier of node.descendantsOfType('type_identifier')) {
    if (!shouldSkipDartConcreteMethodReturnType(node, typeIdentifier)) {
      handleDartTypeReference(typeIdentifier, filePath, relations, symbolPaths, currentSymbolId);
    }
  }
}
