import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '../../../../../../core/plugins/types/contracts';
import { resolveJavaTypePath } from '../projectRoots';
import type { ImportedBinding } from '../analyze/model';
import { getLastPathSegment, getNodeText } from '../analyze/nodes';
import { addImportRelation } from '../analyze/results';

export function handleJavaImportDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  sourceRoot: string | null,
  relations: IAnalysisRelation[],
  importedBindings: Map<string, ImportedBinding>,
): void {
  const specifier = getNodeText(node.namedChildren[0]);
  if (!specifier) {
    return;
  }

  const resolvedPath = sourceRoot ? resolveJavaTypePath(sourceRoot, specifier) : null;
  addImportRelation(relations, filePath, specifier, resolvedPath);
  importedBindings.set(getLastPathSegment(specifier, '.'), {
    importedName: specifier,
    resolvedPath,
    specifier,
  });
}
