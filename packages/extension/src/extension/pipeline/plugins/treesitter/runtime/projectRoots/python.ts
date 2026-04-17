import { dedupePaths, findNearestProjectRoot } from './search/projectRoot';

const pythonProjectMarkers = [
  'pyproject.toml',
  'setup.py',
  'setup.cfg',
  'Pipfile',
] as const;

export function getPythonSearchRoots(filePath: string, workspaceRoot: string): string[] {
  const pythonProjectRoot = findNearestProjectRoot(filePath, pythonProjectMarkers, workspaceRoot);
  return dedupePaths([pythonProjectRoot, workspaceRoot]);
}
