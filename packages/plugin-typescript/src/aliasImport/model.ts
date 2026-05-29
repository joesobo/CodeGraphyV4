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
const EXTENSIONLESS_IMPORT_CANDIDATE_EXTENSIONS = ['.ts', '.tsx', '.d.ts', '.mts', '.d.mts', '.cts', '.d.cts'] as const;
const TYPESCRIPT_SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts']);
const IMPORT_EXTENSION_SUBSTITUTIONS: Record<string, string[]> = {
  '.js': ['.ts', '.tsx', '.d.ts', '.js'],
  '.jsx': ['.tsx', '.d.ts', '.jsx'],
  '.mjs': ['.mts', '.d.mts', '.mjs'],
  '.cjs': ['.cts', '.d.cts', '.cjs'],
};

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

  const parsed = readCompilerOptions(tsconfigPath);
  if (!parsed?.options.paths) {
    return null;
  }

  return {
    paths: createPathMappings(parsed.options.paths, parsed.options, tsconfigPath, workspaceRoot),
  };
}

function readCompilerOptions(tsconfigPath: string): ts.ParsedCommandLine | null {
  const readResult = ts.readConfigFile(tsconfigPath, fileName => ts.sys.readFile(fileName));
  if (readResult.error) {
    return null;
  }

  return ts.parseJsonConfigFileContent(
    readResult.config,
    ts.sys,
    path.dirname(tsconfigPath),
    undefined,
    tsconfigPath,
  );
}

function createPathMappings(
  paths: ts.MapLike<string[]>,
  options: ts.CompilerOptions,
  tsconfigPath: string,
  workspaceRoot: string,
): TypeScriptPathMapping[] {
  const parsedBaseUrl = asString(options.baseUrl);
  const parsedPathsBasePath = asString(options.pathsBasePath);
  const baseUrl = toWorkspacePath(parsedBaseUrl ?? parsedPathsBasePath ?? path.dirname(tsconfigPath), workspaceRoot);
  return Object.entries(paths)
    .map(([key, targets]) => ({
      baseUrl,
      key,
      targets,
    }))
    .sort(comparePathMappingSpecificity);
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string'
    ? value
    : undefined;
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

function extractModuleSpecifiers(filePath: string, content: string): string[] {
  const sourceFile = createSourceFile(filePath, content);
  const specifiers: string[] = [];

  function visit(node: ts.Node): void {
    const specifier = readModuleSpecifier(node);
    if (specifier) {
      specifiers.push(specifier);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return specifiers;
}

function createSourceFile(filePath: string, content: string): ts.SourceFile {
  return ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

function readModuleSpecifier(node: ts.Node): string | null {
  return readStaticModuleSpecifier(node)
    ?? readImportEqualsSpecifier(node)
    ?? readDynamicImportSpecifier(node);
}

function readStaticModuleSpecifier(node: ts.Node): string | null {
  if (!ts.isImportDeclaration(node) && !ts.isExportDeclaration(node)) {
    return null;
  }

  return readStringLiteralText(node.moduleSpecifier);
}

function readImportEqualsSpecifier(node: ts.Node): string | null {
  if (!ts.isImportEqualsDeclaration(node) || !ts.isExternalModuleReference(node.moduleReference)) {
    return null;
  }

  return readStringLiteralText(node.moduleReference.expression);
}

function readDynamicImportSpecifier(node: ts.Node): string | null {
  if (!ts.isCallExpression(node) || node.expression.kind !== ts.SyntaxKind.ImportKeyword) {
    return null;
  }

  return readStringLiteralText(node.arguments[0]);
}

function readStringLiteralText(moduleSpecifier: ts.Expression | undefined): string | null {
  return moduleSpecifier && ts.isStringLiteralLike(moduleSpecifier)
    ? moduleSpecifier.text
    : null;
}

function createExistingFileCandidates(basePath: string): string[] {
  const extension = path.extname(basePath);
  if (extension) {
    const extensionSubstitutions = IMPORT_EXTENSION_SUBSTITUTIONS[extension] ?? [extension];
    const pathWithoutExtension = basePath.slice(0, -extension.length);
    return extensionSubstitutions.map(candidateExtension => `${pathWithoutExtension}${candidateExtension}`);
  }

  return [
    basePath,
    ...EXTENSIONLESS_IMPORT_CANDIDATE_EXTENSIONS.map(candidateExtension => `${basePath}${candidateExtension}`),
    ...EXTENSIONLESS_IMPORT_CANDIDATE_EXTENSIONS.map(candidateExtension => (
      path.join(basePath, `index${candidateExtension}`)
    )),
  ];
}

function resolveExistingFile(basePath: string): string | null {
  const candidates = createExistingFileCandidates(basePath);
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
    relations: extractModuleSpecifiers(filePath, content)
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
