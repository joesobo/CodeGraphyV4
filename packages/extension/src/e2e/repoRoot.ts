import * as fs from 'fs';
import * as path from 'path';

export function findRepoRoot(startDir: string): string {
  let currentDir = startDir;
  while (currentDir !== path.dirname(currentDir)) {
    if (fs.existsSync(path.join(currentDir, 'pnpm-workspace.yaml'))) return currentDir;
    currentDir = path.dirname(currentDir);
  }
  throw new Error(`Unable to locate repo root from ${startDir}`);
}
