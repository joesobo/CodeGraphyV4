import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import { addInheritRelation, addOverrideRelation } from '../analyze/results';
import { resolvePascalTypePath } from './units';

export function addPascalInheritance(
  relations: IAnalysisRelation[],
  filePath: string,
  source: string,
  workspaceRoot: string,
  importedUnits: ReadonlySet<string>,
): void {
  const basePaths = new Map<string, string | null>();
  for (const match of source.matchAll(/\b([A-Za-z_]\w*)\s*=\s*class\s*\(\s*([A-Za-z_]\w*)\s*\)/gi)) {
    const resolvedPath = resolvePascalTypePath(filePath, workspaceRoot, match[2], importedUnits);
    basePaths.set(match[1], resolvedPath);
    addInheritRelation(relations, filePath, match[2], resolvedPath);
  }
  addPascalOverrides(relations, filePath, source, basePaths);
}

function addPascalOverrides(
  relations: IAnalysisRelation[],
  filePath: string,
  source: string,
  basePaths: ReadonlyMap<string, string | null>,
): void {
  for (const match of source.matchAll(/\b([A-Za-z_]\w*)\s*=\s*class\s*\([^)]*\)([\s\S]*?)\bend\s*;/gi)) {
    addPascalClassOverrides(relations, filePath, match[2], basePaths.get(match[1]) ?? null);
  }
}

function addPascalClassOverrides(
  relations: IAnalysisRelation[],
  filePath: string,
  classBody: string,
  resolvedPath: string | null,
): void {
  for (const method of classBody.matchAll(/\b(?:procedure|function)\s+([A-Za-z_]\w*)\b[^\n]*\boverride\b/gi)) {
    addOverrideRelation(relations, filePath, method[1], resolvedPath, `${filePath}:method:${method[1]}`);
  }
}
