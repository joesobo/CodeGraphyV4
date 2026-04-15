import { resolvePythonModulePath } from './paths';

export function resolvePythonImportFromPath(
  filePath: string,
  workspaceRoot: string,
  moduleSpecifier: string,
  specifier: string,
): string | null {
  return resolvePythonModulePath(filePath, workspaceRoot, specifier)
    ?? (moduleSpecifier
      ? resolvePythonModulePath(filePath, workspaceRoot, moduleSpecifier)
      : null);
}
