import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '../../../../../../core/plugins/types/contracts';
import { addImportRelation } from '../analyze/results';
import { getStringSpecifier } from '../analyze/stringSpecifier';
import { resolveDartImportPath } from './paths';

export function handleDartLibraryImport(
  node: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
): void {
  const specifier = getStringSpecifier(node.descendantsOfType('string_literal')[0]);
  if (!specifier) {
    return;
  }

  addImportRelation(
    relations,
    filePath,
    specifier,
    resolveDartImportPath(filePath, workspaceRoot, specifier),
  );
}
