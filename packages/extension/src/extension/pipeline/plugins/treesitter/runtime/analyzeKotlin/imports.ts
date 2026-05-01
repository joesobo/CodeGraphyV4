import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '../../../../../../core/plugins/types/contracts';
import type { ImportedBinding } from '../analyze/model';
import { getLastPathSegment } from '../analyze/nodes';
import { addImportRelation } from '../analyze/results';
import { resolveKotlinTypePath } from '../projectRoots/kotlin';

export function handleKotlinImport(
  node: Parser.SyntaxNode,
  filePath: string,
  sourceRoot: string | null,
  relations: IAnalysisRelation[],
  importedBindings: Map<string, ImportedBinding>,
): void {
  const specifier = node.namedChildren.find((child) => child.type === 'qualified_identifier')?.text;
  if (!specifier) {
    return;
  }

  const resolvedPath = resolveKotlinTypePath(sourceRoot, specifier);
  addImportRelation(relations, filePath, specifier, resolvedPath);
  importedBindings.set(getLastPathSegment(specifier, '.'), {
    importedName: specifier,
    resolvedPath,
    specifier,
  });
}
