import * as fs from 'node:fs';
import * as path from 'node:path';
import ts from 'typescript';
import { comparePathMappingSpecificity, type TypeScriptPathMapping } from './pathMapping';

export type TypeScriptAliasConfig = {
  paths: TypeScriptPathMapping[];
};

type CompilerOptionsCacheEntry = {
  mtimeMs: number;
  parsed: ts.ParsedCommandLine | null;
};

const compilerOptionsCache = new Map<string, CompilerOptionsCacheEntry>();

export function clearTypeScriptAliasConfigCache(): void {
  compilerOptionsCache.clear();
}

export function readTypeScriptAliasConfig(filePath: string, workspaceRoot: string): TypeScriptAliasConfig | null {
  const tsconfigPath = findNearestTypeScriptConfig(filePath, workspaceRoot);
  if (!tsconfigPath) {
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

function findNearestTypeScriptConfig(filePath: string, workspaceRoot: string): string | null {
  const realWorkspaceRoot = fs.realpathSync.native(workspaceRoot);
  let currentDirectory = fs.realpathSync.native(path.dirname(filePath));

  while (currentDirectory === realWorkspaceRoot || currentDirectory.startsWith(`${realWorkspaceRoot}${path.sep}`)) {
    const tsconfigPath = path.join(currentDirectory, 'tsconfig.json');
    if (fs.existsSync(tsconfigPath)) {
      return tsconfigPath;
    }

    const parentDirectory = path.dirname(currentDirectory);
    if (parentDirectory === currentDirectory) {
      return null;
    }
    currentDirectory = parentDirectory;
  }

  return null;
}

function readCompilerOptions(tsconfigPath: string): ts.ParsedCommandLine | null {
  const mtimeMs = fs.statSync(tsconfigPath).mtimeMs;
  const cached = compilerOptionsCache.get(tsconfigPath);
  if (cached?.mtimeMs === mtimeMs) {
    return cached.parsed;
  }

  const readResult = ts.readConfigFile(tsconfigPath, fileName => ts.sys.readFile(fileName));
  const parsed = readResult.error
    ? null
    : ts.parseJsonConfigFileContent(
        readResult.config,
        createCompilerOptionsParseHost(),
        path.dirname(tsconfigPath),
        undefined,
        tsconfigPath,
      );

  compilerOptionsCache.set(tsconfigPath, {
    mtimeMs,
    parsed,
  });

  if (!parsed) {
    return null;
  }

  return parsed;
}

function createCompilerOptionsParseHost(): ts.ParseConfigHost {
  return {
    directoryExists: directoryName => ts.sys.directoryExists?.(directoryName) ?? false,
    fileExists: fileName => ts.sys.fileExists(fileName),
    getCurrentDirectory: () => ts.sys.getCurrentDirectory(),
    readDirectory: () => [],
    readFile: fileName => ts.sys.readFile(fileName),
    realpath: pathName => ts.sys.realpath?.(pathName) ?? pathName,
    useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
  };
}

function createPathMappings(
  paths: ts.MapLike<string[]>,
  options: ts.CompilerOptions,
  tsconfigPath: string,
  workspaceRoot: string,
): TypeScriptPathMapping[] {
  const pathsBasePath = typeof options.pathsBasePath === 'string'
    ? options.pathsBasePath
    : undefined;
  const baseUrl = toWorkspacePath(options.baseUrl ?? pathsBasePath ?? path.dirname(tsconfigPath), workspaceRoot);
  return Object.entries(paths)
    .map(([key, targets]) => ({
      baseUrl,
      key,
      targets,
    }))
    .sort(comparePathMappingSpecificity);
}

function toWorkspacePath(candidate: string, workspaceRoot: string): string {
  const realWorkspaceRoot = fs.realpathSync.native(workspaceRoot);
  return candidate === realWorkspaceRoot || candidate.startsWith(`${realWorkspaceRoot}${path.sep}`)
    ? path.join(workspaceRoot, path.relative(realWorkspaceRoot, candidate))
    : candidate;
}
