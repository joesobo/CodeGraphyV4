import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import type { ImportedBinding } from '../analyze/model';
import { addCallRelation } from '../analyze/results';

export function handleKotlinCallExpression(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  importedBindings: ReadonlyMap<string, ImportedBinding>,
  callablePaths: ReadonlyMap<string, string>,
  currentSymbolId?: string,
): void {
  const calleeName = node.childForFieldName('function')?.text ?? node.namedChildren[0]?.text;
  if (!calleeName) return;
  const target = resolveKotlinCallTarget(calleeName, filePath, importedBindings, callablePaths);
  if (!target) return;
  addCallRelation(relations, filePath, target.binding ?? {
    importedName: calleeName,
    localName: calleeName,
    resolvedPath: target.resolvedPath,
    specifier: calleeName,
  }, currentSymbolId);
}

interface KotlinCallTarget {
  binding: ImportedBinding | undefined;
  resolvedPath: string;
}

function resolveKotlinCallTarget(
  calleeName: string,
  filePath: string,
  importedBindings: ReadonlyMap<string, ImportedBinding>,
  callablePaths: ReadonlyMap<string, string>,
): KotlinCallTarget | null {
  const binding = importedBindings.get(calleeName);
  const resolvedPath = binding?.resolvedPath ?? callablePaths.get(calleeName) ?? null;
  return resolvedPath && resolvedPath !== filePath ? { binding, resolvedPath } : null;
}
