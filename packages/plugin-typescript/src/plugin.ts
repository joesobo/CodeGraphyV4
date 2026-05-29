import * as fs from 'node:fs';
import * as path from 'node:path';
import type { IFileAnalysisResult, IPlugin } from '@codegraphy-dev/plugin-api';
import manifest from '../codegraphy.json';

export const TYPESCRIPT_ALIAS_IMPORT_EDGE_TYPE = {
  id: 'codegraphy.typescript:alias-import',
  label: 'TypeScript Alias Import',
  defaultColor: '#38BDF8',
  defaultVisible: true,
} as const;

const COMPILER_OPTIONS_PATHS_SOURCE_ID = 'compiler-options-paths';
const IMPORT_RESOLUTION_EXTENSIONS = ['', '.ts', '.tsx', '.mts', '.cts'] as const;

type TypeScriptPathMapping = {
  key: string;
  targets: string[];
};

type TypeScriptAliasConfig = {
  baseUrl: string;
  paths: TypeScriptPathMapping[];
};

function readTypeScriptAliasConfig(workspaceRoot: string): TypeScriptAliasConfig | null {
  const tsconfigPath = path.join(workspaceRoot, 'tsconfig.json');
  if (!fs.existsSync(tsconfigPath)) {
    return null;
  }

  const parsed = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8')) as {
    compilerOptions?: {
      baseUrl?: string;
      paths?: Record<string, string[]>;
    };
  };
  const compilerOptions = parsed.compilerOptions;
  const paths = compilerOptions?.paths;
  if (!paths) {
    return null;
  }

  return {
    baseUrl: path.resolve(workspaceRoot, compilerOptions.baseUrl ?? '.'),
    paths: Object.entries(paths).map(([key, targets]) => ({ key, targets })),
  };
}

function extractModuleSpecifiers(content: string): string[] {
  return [...content.matchAll(/\b(?:import|export)\b[^'"]*['"]([^'"]+)['"]/g)]
    .map(match => match[1])
    .filter((specifier): specifier is string => Boolean(specifier));
}

function resolveExistingFile(basePath: string): string | null {
  const candidates = [
    ...IMPORT_RESOLUTION_EXTENSIONS.map(extension => `${basePath}${extension}`),
    ...IMPORT_RESOLUTION_EXTENSIONS.slice(1).map(extension => path.join(basePath, `index${extension}`)),
  ];

  return candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) ?? null;
}

function resolvePathMappingTarget(
  specifier: string,
  mapping: TypeScriptPathMapping,
  target: string,
  baseUrl: string,
): string | null {
  if (!mapping.key.includes('*')) {
    return specifier === mapping.key ? resolveExistingFile(path.resolve(baseUrl, target)) : null;
  }

  const [prefix, suffix] = mapping.key.split('*');
  if (!prefix || suffix === undefined || !specifier.startsWith(prefix) || !specifier.endsWith(suffix)) {
    return null;
  }

  const matched = specifier.slice(prefix.length, specifier.length - suffix.length);
  return resolveExistingFile(path.resolve(baseUrl, target.replace('*', matched)));
}

function resolveAliasImport(
  specifier: string,
  config: TypeScriptAliasConfig,
): string | null {
  for (const mapping of config.paths) {
    for (const target of mapping.targets) {
      const resolved = resolvePathMappingTarget(specifier, mapping, target, config.baseUrl);
      if (resolved) {
        return resolved;
      }
    }
  }

  return null;
}

async function analyzeTypeScriptAliasImports(
  filePath: string,
  content: string,
  workspaceRoot: string,
): Promise<IFileAnalysisResult> {
  const config = readTypeScriptAliasConfig(workspaceRoot);
  if (!config) {
    return { filePath, relations: [] };
  }

  return {
    filePath,
    relations: extractModuleSpecifiers(content)
      .map(specifier => ({
        specifier,
        resolvedPath: resolveAliasImport(specifier, config),
      }))
      .filter((relation): relation is { specifier: string; resolvedPath: string } => Boolean(relation.resolvedPath))
      .map(relation => ({
        kind: TYPESCRIPT_ALIAS_IMPORT_EDGE_TYPE.id,
        sourceId: COMPILER_OPTIONS_PATHS_SOURCE_ID,
        fromFilePath: filePath,
        toFilePath: relation.resolvedPath,
        resolvedPath: relation.resolvedPath,
        specifier: relation.specifier,
      })),
  };
}

/**
 * TypeScript/JavaScript metadata plugin.
 *
 * Base JS/TS parsing now lives in the built-in Tree-sitter plugin. This plugin
 * only contributes ecosystem metadata such as file colors and default filters.
 */
export function createTypeScriptPlugin(): IPlugin {
  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    apiVersion: manifest.apiVersion,
    supportedExtensions: manifest.supportedExtensions,
    defaultFilters: manifest.defaultFilters,
    fileColors: manifest.fileColors,
    contributeEdgeTypes: () => [TYPESCRIPT_ALIAS_IMPORT_EDGE_TYPE],
    analyzeFile: analyzeTypeScriptAliasImports,
  };
}

export default createTypeScriptPlugin;
