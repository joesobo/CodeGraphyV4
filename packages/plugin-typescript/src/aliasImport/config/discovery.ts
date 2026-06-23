import * as fs from 'node:fs';
import * as path from 'node:path';

export function findNearestTypeScriptConfig(filePath: string, workspaceRoot: string): string | null {
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
