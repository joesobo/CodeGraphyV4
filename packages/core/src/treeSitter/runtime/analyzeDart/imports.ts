import type Parser from 'tree-sitter';
import type { IAnalysisRelationshipEvidence } from '@codegraphy-dev/plugin-api';
import { addImportRelation } from '../analyze/results';
import { getStringSpecifier } from '../analyze/stringSpecifier';
import { resolveDartImportPath } from './paths';

export function handleDartLibraryImport(
  node: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelationshipEvidence[],
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
