import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const tempRoots = new Set<string>();

export function createProjectRootsWorkspace(): string {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-project-roots-'));
  tempRoots.add(workspaceRoot);
  return workspaceRoot;
}

export function writeProjectRootsFile(
  workspaceRoot: string,
  relativePath: string,
  contents = '',
): string {
  const absolutePath = path.join(workspaceRoot, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, contents, 'utf8');
  return absolutePath;
}

export function cleanupProjectRootsWorkspaces(): void {
  for (const workspaceRoot of tempRoots) {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  }
  tempRoots.clear();
}
