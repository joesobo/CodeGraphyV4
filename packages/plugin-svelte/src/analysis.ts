import { parse } from 'svelte/compiler';
import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import { extractScriptImports } from './imports';
import { resolveSvelteScriptImport } from './resolver';

const SCRIPT_IMPORT_SOURCE_ID = 'svelte-script-import';
const SCRIPT_TYPE_IMPORT_SOURCE_ID = 'svelte-script-type-import';
const SCRIPT_DYNAMIC_IMPORT_SOURCE_ID = 'svelte-script-dynamic-import';

export function analyzeSvelteComponent(filePath: string, content: string): IFileAnalysisResult {
  if (!filePath.endsWith('.svelte') || !canParseSvelte(content)) {
    return { filePath, relations: [] };
  }

  return {
    filePath,
    relations: extractSvelteScriptContents(content)
      .flatMap(scriptContent => extractScriptImports(filePath, scriptContent))
      .map(scriptImport => ({
        scriptImport,
        resolvedPath: resolveSvelteScriptImport(filePath, scriptImport.specifier),
      }))
      .filter((relation): relation is {
        scriptImport: ReturnType<typeof extractScriptImports>[number];
        resolvedPath: string;
      } => Boolean(relation.resolvedPath))
      .map(({ scriptImport, resolvedPath }) => ({
        kind: scriptImport.kind,
        sourceId: getSvelteScriptImportSourceId(scriptImport),
        fromFilePath: filePath,
        toFilePath: resolvedPath,
        resolvedPath,
        specifier: scriptImport.specifier,
      })),
  };
}

function canParseSvelte(content: string): boolean {
  try {
    parse(content);
    return true;
  } catch {
    return false;
  }
}

function extractSvelteScriptContents(content: string): string[] {
  return Array.from(content.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))
    .map(match => match[1])
    .filter((scriptContent): scriptContent is string => Boolean(scriptContent));
}

function getSvelteScriptImportSourceId(scriptImport: ReturnType<typeof extractScriptImports>[number]): string {
  if (scriptImport.source === 'dynamic') {
    return SCRIPT_DYNAMIC_IMPORT_SOURCE_ID;
  }

  return scriptImport.kind === 'type-import'
    ? SCRIPT_TYPE_IMPORT_SOURCE_ID
    : SCRIPT_IMPORT_SOURCE_ID;
}
