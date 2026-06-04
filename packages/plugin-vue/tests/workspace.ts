import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export function createWorkspaceRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-plugin-vue-'));
}

export function writeWorkspaceFile(workspaceRoot: string, relativePath: string, contents: string): string {
  const absolutePath = path.join(workspaceRoot, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, contents, 'utf8');
  return absolutePath;
}

export function removeWorkspaceRoot(workspaceRoot: string): void {
  fs.rmSync(workspaceRoot, { recursive: true, force: true });
}
