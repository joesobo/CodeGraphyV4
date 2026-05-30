import type Parser from 'tree-sitter';
import type { IAnalysisRelationshipEvidence } from '@codegraphy-dev/plugin-api';
import { addImportRelation } from '../analyze/results';
import { resolveHaskellModulePath } from '../projectRoots/haskell';

export function handleHaskellImport(
  node: Parser.SyntaxNode,
  filePath: string,
  sourceRoot: string | null,
  relations: IAnalysisRelationshipEvidence[],
): void {
  const specifier = node.childForFieldName('module')?.text;
  if (!specifier) {
    return;
  }

  addImportRelation(
    relations,
    filePath,
    specifier,
    resolveHaskellModulePath(sourceRoot, specifier),
  );
}
