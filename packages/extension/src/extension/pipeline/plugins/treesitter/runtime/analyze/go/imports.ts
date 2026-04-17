import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '../../../../../../../core/plugins/types/contracts';
import { resolveGoPackagePath } from '../../projectRoots';
import { resolveTreeSitterImportPath } from '../../resolve';
import type { ImportedBinding, SymbolWalkState, TreeWalkAction } from '../model';
import { getIdentifierText, getLastPathSegment, getStringSpecifier } from '../nodes';
import { addImportRelation } from '../results';

function getGoImportLocalName(importSpec: Parser.SyntaxNode, specifier: string): string {
  const aliasName = getIdentifierText(importSpec.childForFieldName('name'));
  if (aliasName) {
    return aliasName;
  }

  return getLastPathSegment(specifier, '/');
}

export function handleGoImportDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  importedBindings: Map<string, ImportedBinding>,
): TreeWalkAction<SymbolWalkState> {
  const importSpecs = node.descendantsOfType('import_spec');
  for (const importSpec of importSpecs) {
    const specifier = getStringSpecifier(importSpec.childForFieldName('path'));
    if (!specifier) {
      continue;
    }

    const resolvedPath = specifier.startsWith('.')
      ? resolveTreeSitterImportPath(filePath, specifier)
      : resolveGoPackagePath(filePath, workspaceRoot, specifier);
    addImportRelation(relations, filePath, specifier, resolvedPath);
    importedBindings.set(getGoImportLocalName(importSpec, specifier), {
      importedName: specifier,
      resolvedPath,
      specifier,
    });
  }
  return { skipChildren: true };
}
