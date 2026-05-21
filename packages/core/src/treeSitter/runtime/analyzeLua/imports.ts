import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import { addImportRelation } from '../analyze/results';
import { resolveLuaModulePath } from './paths';

function getLuaStringContent(node: Parser.SyntaxNode): string | null {
  return node.descendantsOfType('string_content')[0]?.text ?? null;
}

export function handleLuaFunctionCall(
  node: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
): boolean {
  const name = node.childForFieldName('name');
  if (name?.text !== 'require') {
    return false;
  }

  const specifier = getLuaStringContent(node);
  if (!specifier) {
    return true;
  }

  addImportRelation(
    relations,
    filePath,
    specifier,
    resolveLuaModulePath(filePath, workspaceRoot, specifier),
  );
  return true;
}
