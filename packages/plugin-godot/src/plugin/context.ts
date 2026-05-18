import * as path from 'path';
import { normalizePath } from '../parser';
import type { GDScriptPathResolver } from '../PathResolver';
import { resolveGodotProjectRoot } from '../projectRoot';
import type { GodotAnalysisContext } from './types';

export function buildAnalysisContext(
  resolver: GDScriptPathResolver,
  filePath: string,
  workspaceRoot: string,
  projectRoots: Set<string>,
): GodotAnalysisContext {
  return {
    resolver,
    projectRoot: resolveGodotProjectRoot(filePath, workspaceRoot, projectRoots),
    relativeFilePath: normalizePath(path.relative(workspaceRoot, filePath)),
    workspaceRoot,
  };
}
