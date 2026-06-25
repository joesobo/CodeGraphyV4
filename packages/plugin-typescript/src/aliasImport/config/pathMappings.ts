import * as fs from 'node:fs';
import * as path from 'node:path';
import ts from 'typescript';
import { comparePathMappingSpecificity, type TypeScriptPathMapping } from '../pathMapping';

export function createPathMappings(
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
