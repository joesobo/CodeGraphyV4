import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '../../../../../../core/plugins/types/contracts';
import type { ImportedBinding } from '../analyze/model';
import { getLastPathSegment } from '../analyze/nodes';
import { addImportRelation } from '../analyze/results';
import { resolvePhpTypePath } from '../projectRoots/php';

function getUseClauseSpecifier(node: Parser.SyntaxNode): string | null {
  return node.descendantsOfType('qualified_name')[0]?.text
    ?? node.descendantsOfType('name')[0]?.text
    ?? null;
}

export function handlePhpNamespaceUseDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  sourceRoot: string | null,
  relations: IAnalysisRelation[],
  importedBindings: Map<string, ImportedBinding>,
): void {
  for (const useClause of node.descendantsOfType('namespace_use_clause')) {
    const specifier = getUseClauseSpecifier(useClause);
    if (!specifier) {
      continue;
    }

    const resolvedPath = resolvePhpTypePath(sourceRoot, specifier);
    addImportRelation(relations, filePath, specifier, resolvedPath);
    importedBindings.set(getLastPathSegment(specifier, '\\'), {
      importedName: specifier,
      resolvedPath,
      specifier,
    });
  }
}
