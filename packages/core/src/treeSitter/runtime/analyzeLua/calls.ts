import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import { addCallRelation } from '../analyze/results';

export function getLuaRequireLocalName(node: Parser.SyntaxNode): string | null {
  const assignment = node.parent?.parent;
  if (assignment?.type !== 'assignment_statement') return null;
  return assignment
    .descendantsOfType('variable_list')[0]
    ?.descendantsOfType('identifier')[0]
    ?.text ?? null;
}

export function handleLuaRequiredModuleCall(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  requiredModulesByLocalName: ReadonlyMap<string, IAnalysisRelation>,
  currentSymbolId?: string,
): void {
  const callee = node.childForFieldName('name') ?? node.namedChildren[0];
  if (callee?.type !== 'dot_index_expression') return;
  const localName = callee.namedChildren[0]?.text;
  if (!localName) return;
  const importRelation = requiredModulesByLocalName.get(localName);
  if (!importRelation?.resolvedPath || !importRelation.specifier) return;
  addCallRelation(relations, filePath, {
    importedName: importRelation.specifier,
    localName,
    resolvedPath: importRelation.resolvedPath,
    specifier: importRelation.specifier,
  }, currentSymbolId);
}
