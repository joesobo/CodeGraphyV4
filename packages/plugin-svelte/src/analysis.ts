import { parse } from 'svelte/compiler';
import type { AST } from 'svelte/compiler';
import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import { extractScriptImports } from './imports';
import { resolveSvelteScriptImport } from './resolver';

const SCRIPT_IMPORT_SOURCE_ID = 'svelte-script-import';
const SCRIPT_TYPE_IMPORT_SOURCE_ID = 'svelte-script-type-import';
const SCRIPT_DYNAMIC_IMPORT_SOURCE_ID = 'svelte-script-dynamic-import';

interface SveltePositionedProgram {
  start: number;
  end: number;
}

export function analyzeSvelteComponent(filePath: string, content: string): IFileAnalysisResult {
  if (!filePath.endsWith('.svelte')) {
    return { filePath, relations: [] };
  }

  const scriptContents = extractSvelteScriptContents(filePath, content);

  return {
    filePath,
    relations: scriptContents
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

function parseSvelteComponent(filePath: string, content: string): AST.Root | null {
  try {
    return parse(content, {
      filename: filePath,
      modern: true,
    });
  } catch {
    return null;
  }
}

function extractSvelteScriptContents(filePath: string, content: string): string[] {
  const ast = parseSvelteComponent(filePath, content);
  if (!ast) {
    return [];
  }

  return [ast.module, ast.instance]
    .map(script => readSvelteScriptProgram(content, script))
    .filter((scriptContent): scriptContent is string => Boolean(scriptContent));
}

function readSvelteScriptProgram(content: string, script: AST.Script | null): string | null {
  const program = script?.content;
  if (!isSveltePositionedProgram(program)) {
    return null;
  }

  return content.slice(program.start, program.end);
}

function isSveltePositionedProgram(program: unknown): program is SveltePositionedProgram {
  return typeof program === 'object'
    && program !== null
    && 'start' in program
    && 'end' in program
    && typeof program.start === 'number'
    && typeof program.end === 'number';
}

function getSvelteScriptImportSourceId(scriptImport: ReturnType<typeof extractScriptImports>[number]): string {
  if (scriptImport.source === 'dynamic') {
    return SCRIPT_DYNAMIC_IMPORT_SOURCE_ID;
  }

  return scriptImport.kind === 'type-import'
    ? SCRIPT_TYPE_IMPORT_SOURCE_ID
    : SCRIPT_IMPORT_SOURCE_ID;
}
