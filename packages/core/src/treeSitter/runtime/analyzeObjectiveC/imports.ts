import * as path from 'node:path';
import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import { addLocalImport } from '../analyzeTextBaseline';

export function addObjectiveCImports(
  relations: IAnalysisRelation[],
  filePath: string,
  source: string,
  workspaceRoot: string,
): Map<string, string> {
  const importedTypePaths = new Map<string, string>();
  for (const match of source.matchAll(/^\s*#\s*import\s+(?:"([^"]+)"|<([^>]+)>)/gm)) {
    addObjectiveCImport(relations, filePath, workspaceRoot, match[1] ?? match[2], importedTypePaths);
  }
  return importedTypePaths;
}

function addObjectiveCImport(
  relations: IAnalysisRelation[],
  filePath: string,
  workspaceRoot: string,
  specifier: string | undefined,
  importedTypePaths: Map<string, string>,
): void {
  if (!specifier || specifier.includes('/usr/include') || specifier.startsWith('Foundation/')) return;
  const localRoot = path.dirname(path.dirname(filePath)).startsWith(workspaceRoot)
    ? workspaceRoot
    : path.dirname(filePath);
  addLocalImport(relations, filePath, localRoot, specifier, ['.h', '.m', '.mm']);
  const typeName = specifier.split('/').pop()?.replace(/\.[hm]+$/, '');
  const resolvedPath = relations.at(-1)?.resolvedPath;
  if (typeName && resolvedPath) importedTypePaths.set(typeName, resolvedPath);
}
