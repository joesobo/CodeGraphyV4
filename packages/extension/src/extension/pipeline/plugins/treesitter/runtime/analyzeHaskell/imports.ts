import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '../../../../../../core/plugins/types/contracts';
import { addImportRelation } from '../analyze/results';
import { resolveHaskellModulePath } from '../projectRoots/haskell';

export function handleHaskellImport(
  node: Parser.SyntaxNode,
  filePath: string,
  sourceRoot: string | null,
  relations: IAnalysisRelation[],
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
