import * as fs from 'node:fs';
import * as path from 'node:path';
import type { IAnalysisFile, IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import ts from 'typescript';

export const TYPESCRIPT_ALIAS_IMPORT_EDGE_TYPE = {
  id: 'codegraphy.typescript:alias-import',
  label: 'TypeScript Alias Import',
  defaultColor: '#38BDF8',
  defaultVisible: true,
} as const;

const COMPILER_OPTIONS_PATHS_SOURCE_ID = 'compiler-options-paths';
const IMPORT_RESOLUTION_EXTENSIONS = ['', '.ts', '.tsx', '.d.ts', '.mts', '.cts'] as const;
const TYPESCRIPT_SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts']);

type TypeScriptPathMapping = {
  baseUrl: string;
  key: string;
  targets: string[];
};

type TypeScriptAliasConfig = {
  paths: TypeScriptPathMapping[];
};

function toWorkspacePath(candidate: string, workspaceRoot: string): string {
  const realWorkspaceRoot = fs.realpathSync.native(workspaceRoot);
  return candidate === realWorkspaceRoot || candidate.startsWith(`${realWorkspaceRoot}${path.sep}`)
    ? path.join(workspaceRoot, path.relative(realWorkspaceRoot, candidate))
    : candidate;
}

export function isTypeScriptSourceFile(filePath: string): boolean {
  return TYPESCRIPT_SOURCE_EXTENSIONS.has(path.extname(filePath));
}

export function isTypeScriptConfigFile(filePath: string): boolean {
  return /^tsconfig(?:\..*)?\.json$/.test(path.basename(filePath));
}

function readTypeScriptAliasConfig(workspaceRoot: string): TypeScriptAliasConfig | null {
  const tsconfigPath = path.join(workspaceRoot, 'tsconfig.json');
  if (!fs.existsSync(tsconfigPath)) {
    return null;
  }

  const readResult = ts.readConfigFile(tsconfigPath, fileName => ts.sys.readFile(fileName));
  if (readResult.error) {
    return null;
  }

  const parsed = ts.parseJsonConfigFileContent(
    readResult.config,
    ts.sys,
    path.dirname(tsconfigPath),
    undefined,
    tsconfigPath,
  );
  const paths = parsed.options.paths;
  if (!paths) {
    return null;
  }

  const parsedBaseUrl = typeof parsed.options.baseUrl === 'string' ? parsed.options.baseUrl : undefined;
  const parsedPathsBasePath = typeof parsed.options.pathsBasePath === 'string'
    ? parsed.options.pathsBasePath
    : undefined;
  const baseUrl = toWorkspacePath(parsedBaseUrl ?? parsedPathsBasePath ?? path.dirname(tsconfigPath), workspaceRoot);
  return {
    paths: Object.entries(paths)
      .map(([key, targets]) => ({
        baseUrl,
        key,
        targets,
      }))
      .sort(comparePathMappingSpecificity),
  };
}

function pathMappingSpecificity(mapping: TypeScriptPathMapping): [number, number] {
  const [prefix, suffix] = mapping.key.split('*');
  return suffix === undefined
    ? [Number.POSITIVE_INFINITY, mapping.key.length]
    : [prefix.length, suffix.length];
}

function comparePathMappingSpecificity(
  left: TypeScriptPathMapping,
  right: TypeScriptPathMapping,
): number {
  const [leftPrefixLength, leftSuffixLength] = pathMappingSpecificity(left);
  const [rightPrefixLength, rightSuffixLength] = pathMappingSpecificity(right);
  return rightPrefixLength - leftPrefixLength || rightSuffixLength - leftSuffixLength;
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
  if (suffix === undefined || !specifier.startsWith(prefix) || !specifier.endsWith(suffix)) {
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

export async function analyzeTypeScriptAliasImports(
  filePath: string,
  content: string,
  workspaceRoot: string,
): Promise<IFileAnalysisResult> {
  if (!isTypeScriptSourceFile(filePath)) {
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

export function collectTypeScriptFilePaths(files: IAnalysisFile[]): string[] {
  return files
    .filter(file => isTypeScriptSourceFile(file.relativePath))
    .map(file => file.relativePath);
}
