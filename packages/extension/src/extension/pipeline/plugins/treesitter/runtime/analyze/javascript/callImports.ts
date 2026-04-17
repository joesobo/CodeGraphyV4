import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '../../../../../../../core/plugins/types/contracts';
import { TREE_SITTER_SOURCE_IDS } from '../../languages';
import { resolveTreeSitterImportPath } from '../../resolve';
import { getIdentifierText, getStringSpecifier } from '../nodes';

export function getImportRelationForJavaScriptCallExpression(
  callExpression: Parser.SyntaxNode,
  filePath: string,
): IAnalysisRelation | null {
  const calleeNode = callExpression.childForFieldName('function') ?? callExpression.namedChildren[0];
  const argumentsNode = callExpression.childForFieldName('arguments')
    ?? callExpression.namedChildren.find((child) => child.type === 'arguments');
  const stringNode = argumentsNode?.namedChildren.find((child) =>
    child.type === 'string' || child.type === 'interpreted_string_literal',
  );
  const specifier = getStringSpecifier(stringNode);
  if (!specifier) {
    return null;
  }

  const resolvedPath = resolveTreeSitterImportPath(filePath, specifier);
  if (calleeNode?.type === 'import') {
    return {
      kind: 'import',
      sourceId: TREE_SITTER_SOURCE_IDS.dynamicImport,
      fromFilePath: filePath,
      specifier,
      resolvedPath,
      toFilePath: resolvedPath,
      type: 'dynamic',
    };
  }

  if (getIdentifierText(calleeNode) !== 'require') {
    return null;
  }

  return {
    kind: 'import',
    sourceId: TREE_SITTER_SOURCE_IDS.commonjsRequire,
    fromFilePath: filePath,
    specifier,
    resolvedPath,
    toFilePath: resolvedPath,
    type: 'require',
  };
}
