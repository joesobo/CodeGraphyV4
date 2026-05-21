import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import type { ImportedBinding } from '../analyze/model';
import { addImportRelation } from '../analyze/results';
import { getRubyRequireConstantName, resolveRubyRequirePath } from './paths';

function getRubyRequireSpecifier(node: Parser.SyntaxNode): string | null {
  return node.descendantsOfType('string_content')[0]?.text ?? null;
}

export function handleRubyRequireCall(
  node: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  importedBindings: Map<string, ImportedBinding>,
): boolean {
  const methodName = node.childForFieldName('method')?.text;
  if (methodName !== 'require' && methodName !== 'require_relative') {
    return false;
  }

  const specifier = getRubyRequireSpecifier(node);
  if (!specifier) {
    return true;
  }

  const resolvedPath = resolveRubyRequirePath(
    filePath,
    workspaceRoot,
    specifier,
    methodName === 'require_relative',
  );
  addImportRelation(relations, filePath, specifier, resolvedPath);
  importedBindings.set(getRubyRequireConstantName(specifier), {
    importedName: specifier,
    resolvedPath,
    specifier,
  });
  return true;
}
