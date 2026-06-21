import { parse } from '@vue/compiler-sfc';
import type { IAnalysisRelation, IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import { extractScriptCalls } from './calls';
import { extractScriptImports } from './imports';
import { resolveVueScriptImport } from './resolver';

const SCRIPT_IMPORT_SOURCE_ID = 'sfc-script-import';
const SCRIPT_TYPE_IMPORT_SOURCE_ID = 'sfc-script-type-import';
const SCRIPT_DYNAMIC_IMPORT_SOURCE_ID = 'sfc-script-dynamic-import';

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
    relations: [
      ...extractVueScriptImportRelations(filePath, scriptContents),
      ...extractScriptCalls(filePath, scriptContents.join('\n')),
    ],
  };
}

function extractVueScriptImportRelations(
  filePath: string,
  scriptContents: string[],
): IAnalysisRelation[] {
  return scriptContents
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
      sourceId: getVueScriptImportSourceId(scriptImport),
      fromFilePath: filePath,
      toFilePath: resolvedPath,
      resolvedPath,
      specifier: scriptImport.specifier,
    }));
}

function getVueScriptImportSourceId(scriptImport: ReturnType<typeof extractScriptImports>[number]): string {
  if (scriptImport.source === 'dynamic') {
    return SCRIPT_DYNAMIC_IMPORT_SOURCE_ID;
  }

  return scriptImport.kind === 'type-import'
    ? SCRIPT_TYPE_IMPORT_SOURCE_ID
    : SCRIPT_IMPORT_SOURCE_ID;
}

function parseSfc(content: string): ReturnType<typeof parse>['descriptor'] | null {
  try {
    return parse(content).descriptor;
  } catch {
    return null;
  }
}
