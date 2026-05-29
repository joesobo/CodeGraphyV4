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
const TYPESCRIPT_SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts']);

type TypeScriptPathMapping = {
  baseUrl: string;
  key: string;
  targets: string[];
};

type TypeScriptAliasConfig = {
  paths: TypeScriptPathMapping[];
};

type TsConfigFile = {
  extends?: string;
  compilerOptions?: {
    baseUrl?: string;
    paths?: Record<string, string[]>;
  };
};

function readTsConfigFile(tsconfigPath: string): TsConfigFile {
  const parsed = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8')) as {
    extends?: string;
    compilerOptions?: {
      baseUrl?: string;
      paths?: Record<string, string[]>;
    };
  };
  return parsed;
}

function resolveLocalExtendsPath(tsconfigPath: string, extendedConfig: string): string | null {
  if (!extendedConfig.startsWith('.')) {
    return null;
  }

  const resolved = path.resolve(path.dirname(tsconfigPath), extendedConfig);
  return path.extname(resolved) ? resolved : `${resolved}.json`;
}

function resolvePackageExtendsPath(tsconfigPath: string, extendedConfig: string): string | null {
  let currentDir = path.dirname(tsconfigPath);
  const rootDir = path.parse(currentDir).root;

  while (true) {
    const resolved = path.join(currentDir, 'node_modules', extendedConfig);
    const candidate = path.extname(resolved) ? resolved : `${resolved}.json`;
    if (fs.existsSync(candidate)) {
      return candidate;
    }

    if (currentDir === rootDir) {
      return null;
    }

    currentDir = path.dirname(currentDir);
  }
}

function resolveExtendsPath(tsconfigPath: string, extendedConfig: string): string | null {
  return resolveLocalExtendsPath(tsconfigPath, extendedConfig)
    ?? resolvePackageExtendsPath(tsconfigPath, extendedConfig);
}

function readTypeScriptAliasConfigFile(
  tsconfigPath: string,
  visited = new Set<string>(),
): TypeScriptAliasConfig | null {
  if (!fs.existsSync(tsconfigPath) || visited.has(tsconfigPath)) {
    return null;
  }

  visited.add(tsconfigPath);
  const parsed = readTsConfigFile(tsconfigPath);
  const extendedConfigPath = parsed.extends
    ? resolveExtendsPath(tsconfigPath, parsed.extends)
    : null;
  const inheritedPaths = extendedConfigPath
    ? readTypeScriptAliasConfigFile(extendedConfigPath, visited)?.paths ?? []
    : [];
  const compilerOptions = parsed.compilerOptions;
  const paths = compilerOptions?.paths;
  if (!paths && inheritedPaths.length === 0) {
    return null;
  }

  return {
    paths: [
      ...inheritedPaths,
      ...Object.entries(paths ?? {}).map(([key, targets]) => ({
        baseUrl: path.resolve(path.dirname(tsconfigPath), compilerOptions?.baseUrl ?? '.'),
        key,
        targets,
      })),
    ],
  };
}

function readTypeScriptAliasConfig(workspaceRoot: string): TypeScriptAliasConfig | null {
  return readTypeScriptAliasConfigFile(path.join(workspaceRoot, 'tsconfig.json'));
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
): string | null {
  if (!mapping.key.includes('*')) {
    return specifier === mapping.key ? resolveExistingFile(path.resolve(mapping.baseUrl, target)) : null;
  }

  const [prefix, suffix] = mapping.key.split('*');
  if (!prefix || suffix === undefined || !specifier.startsWith(prefix) || !specifier.endsWith(suffix)) {
    return null;
  }

  const matched = specifier.slice(prefix.length, specifier.length - suffix.length);
  return resolveExistingFile(path.resolve(mapping.baseUrl, target.replace('*', matched)));
}

function resolveAliasImport(
  specifier: string,
  config: TypeScriptAliasConfig,
): string | null {
  for (const mapping of config.paths) {
    for (const target of mapping.targets) {
      const resolved = resolvePathMappingTarget(specifier, mapping, target);
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
  if (!TYPESCRIPT_SOURCE_EXTENSIONS.has(path.extname(filePath))) {
    return { filePath, relations: [] };
  }

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
