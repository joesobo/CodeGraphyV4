import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '../../../../../../core/plugins/types/contracts';
import type { CSharpWalkState } from './model';
import { getCSharpTypeName, resolveCSharpUsingImport } from './resolution';
import { getIdentifierText } from '../analyze/nodes';
export { appendCSharpUsingImportRelations } from './usingImports';
import { addReferenceRelation } from '../analyze/results';

export function handleCSharpReferenceNode(
  node: Parser.SyntaxNode,
  state: CSharpWalkState,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  usingNamespaces: ReadonlySet<string>,
  importTargetsByNamespace: Map<string, Set<string>>,
): void {
  if (node.type !== 'member_access_expression' && node.type !== 'object_creation_expression') {
    return;
  }

  const typeName = node.type === 'member_access_expression'
    ? getIdentifierText(node.childForFieldName('expression') ?? node.namedChildren[0])
    : getCSharpTypeName(node.childForFieldName('type'));
  if (!typeName || !/^[A-Z]/u.test(typeName)) {
    return;
  }

  const resolvedPath = resolveCSharpUsingImport(
    workspaceRoot,
    filePath,
    usingNamespaces,
    importTargetsByNamespace,
    typeName,
    state.currentNamespace,
  );
  if (resolvedPath) {
    addReferenceRelation(
      relations,
      filePath,
      typeName,
      resolvedPath,
      state.currentSymbolId,
    );
  }
}
