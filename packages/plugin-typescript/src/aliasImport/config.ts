import * as fs from 'node:fs';
import * as path from 'node:path';
import ts from 'typescript';
import { comparePathMappingSpecificity, type TypeScriptPathMapping } from './pathMapping';

export type TypeScriptAliasConfig = {
  paths: TypeScriptPathMapping[];
};

export function readTypeScriptAliasConfig(workspaceRoot: string): TypeScriptAliasConfig | null {
  const tsconfigPath = path.join(workspaceRoot, 'tsconfig.json');
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
