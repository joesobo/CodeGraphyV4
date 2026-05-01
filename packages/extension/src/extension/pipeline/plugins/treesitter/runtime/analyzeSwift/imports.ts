import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '../../../../../../core/plugins/types/contracts';
import { addImportRelation } from '../analyze/results';

export function handleSwiftImportDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
): void {
  const specifier = node.namedChildren.find((child) => child.type === 'identifier')?.text;
  if (specifier) {
    addImportRelation(relations, filePath, specifier, null);
  }
}
