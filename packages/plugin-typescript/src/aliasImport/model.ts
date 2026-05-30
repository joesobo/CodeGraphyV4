import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import { readTypeScriptAliasConfig } from './compilerOptions';
import { collectTypeScriptFilePaths, isTypeScriptConfigFile, isTypeScriptSourceFile } from './files';
import { resolveAliasImport } from './resolve';
import { extractModuleSpecifiers } from './specifiers';

export const TYPESCRIPT_ALIAS_IMPORT_EDGE_TYPE = {
  id: 'codegraphy.typescript:alias-import',
  label: 'TypeScript Alias Import',
  defaultColor: '#38BDF8',
  defaultVisible: true,
} as const;

const COMPILER_OPTIONS_PATHS_SOURCE_ID = 'compiler-options-paths';

export {
  collectTypeScriptFilePaths,
  isTypeScriptConfigFile,
  isTypeScriptSourceFile,
};

export async function analyzeTypeScriptAliasImports(
  filePath: string,
  content: string,
  workspaceRoot: string,
): Promise<IFileAnalysisResult> {
  if (!isTypeScriptSourceFile(filePath)) {
    return { filePath, relations: [] };
  }

  const config = readTypeScriptAliasConfig(filePath, workspaceRoot);
  if (!config) {
    return { filePath, relations: [] };
  }

  return {
    filePath,
    relations: extractModuleSpecifiers(filePath, content)
      .map(specifier => ({
        specifier,
        resolvedPath: resolveAliasImport(specifier, config),
      }))
      .filter((relation): relation is { specifier: string; resolvedPath: string } => Boolean(relation.resolvedPath))
      .map(relation => ({
        edgeType: TYPESCRIPT_ALIAS_IMPORT_EDGE_TYPE.id,
        sourceId: COMPILER_OPTIONS_PATHS_SOURCE_ID,
        from: {
          kind: 'file',
          filePath,
        },
        target: {
          kind: 'file',
          path: relation.resolvedPath,
          pathKind: 'absolute',
          specifier: relation.specifier,
        },
        specifier: relation.specifier,
      })),
  };
}
