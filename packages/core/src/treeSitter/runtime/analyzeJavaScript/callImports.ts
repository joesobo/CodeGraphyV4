import type Parser from 'tree-sitter';
import type { IAnalysisRelationshipEvidence } from '@codegraphy-dev/plugin-api';
import { TREE_SITTER_SOURCE_IDS } from '../languages';
import { resolveTreeSitterImportPath } from '../resolve';
import { getIdentifierText, getStringSpecifier } from '../analyze/nodes';
import { createFileTarget } from '../analyze/results';

export function getImportRelationForJavaScriptCallExpression(
  callExpression: Parser.SyntaxNode,
  filePath: string,
): IAnalysisRelationshipEvidence | null {
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
      edgeType: 'import',
      sourceId: TREE_SITTER_SOURCE_IDS.dynamicImport,
      from: { kind: 'file', filePath },
      target: createFileTarget(resolvedPath, specifier),
      timing: 'dynamic',
    };
  }

  if (getIdentifierText(calleeNode) !== 'require') {
    return null;
  }

  return {
    edgeType: 'import',
    sourceId: TREE_SITTER_SOURCE_IDS.commonjsRequire,
    from: { kind: 'file', filePath },
    target: createFileTarget(resolvedPath, specifier),
    timing: 'require',
  };
}
