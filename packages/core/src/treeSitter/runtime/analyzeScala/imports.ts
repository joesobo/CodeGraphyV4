import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import type { ImportedBinding } from '../analyze/model';
import { addDottedImport } from '../analyzeTextBaseline';

const SCALA_EXTENSIONS = ['.scala'] as const;

export function addScalaImports(
  relations: IAnalysisRelation[],
  filePath: string,
  source: string,
  sourceRoot: string | null,
  importedPaths: Map<string, string | null>,
  callableBindings: Map<string, ImportedBinding>,
): void {
  for (const match of source.matchAll(/^\s*import\s+([A-Za-z_][\w.]*)(?:\s*\{[^}]*\})?/gm)) {
    const specifier = match[1];
    const resolvedPath = addDottedImport(relations, filePath, sourceRoot, specifier, SCALA_EXTENSIONS);
    const importedName = specifier.split('.').at(-1) ?? specifier;
    importedPaths.set(importedName, resolvedPath);
    if (resolvedPath) callableBindings.set(importedName, { importedName, specifier: importedName, resolvedPath });
  }
}
