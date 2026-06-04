import { parse } from '@vue/compiler-sfc';
import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import { extractScriptImports } from './imports';
import { resolveVueScriptImport } from './resolver';

const SCRIPT_IMPORT_SOURCE_ID = 'sfc-script-import';
const SCRIPT_TYPE_IMPORT_SOURCE_ID = 'sfc-script-type-import';

export function analyzeVueSfc(filePath: string, content: string): IFileAnalysisResult {
  if (!filePath.endsWith('.vue')) {
    return { filePath, relations: [] };
  }

  const descriptor = parseSfc(content);
  if (!descriptor) {
    return { filePath, relations: [] };
  }

  const scriptContents = [
    descriptor.script?.content,
    descriptor.scriptSetup?.content,
  ].filter((scriptContent): scriptContent is string => Boolean(scriptContent));

  return {
    filePath,
    relations: scriptContents
      .flatMap(scriptContent => extractScriptImports(filePath, scriptContent))
      .map(scriptImport => ({
        scriptImport,
        resolvedPath: resolveVueScriptImport(filePath, scriptImport.specifier),
      }))
      .filter((relation): relation is {
        scriptImport: ReturnType<typeof extractScriptImports>[number];
        resolvedPath: string;
      } => Boolean(relation.resolvedPath))
      .map(({ scriptImport, resolvedPath }) => ({
        kind: scriptImport.kind,
        sourceId: scriptImport.kind === 'type-import'
          ? SCRIPT_TYPE_IMPORT_SOURCE_ID
          : SCRIPT_IMPORT_SOURCE_ID,
        fromFilePath: filePath,
        toFilePath: resolvedPath,
        resolvedPath,
        specifier: scriptImport.specifier,
      })),
  };
}

function parseSfc(content: string): ReturnType<typeof parse>['descriptor'] | null {
  try {
    return parse(content).descriptor;
  } catch {
    return null;
  }
}
