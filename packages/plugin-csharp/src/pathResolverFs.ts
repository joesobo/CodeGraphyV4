import * as fs from 'fs';
import * as path from 'path';

export type ResolverFsOps = {
  fileExists: (relativePath: string) => boolean;
  directoryExists: (relativePath: string) => boolean;
  findCsFileInDir: (relativePath: string) => string | null;
};

export function createResolverFsOps(workspaceRoot: string): ResolverFsOps {
  function fileExists(relativePath: string): boolean {
    try {
      const fullPath = path.join(workspaceRoot, relativePath);
      return fs.existsSync(fullPath) && fs.statSync(fullPath).isFile();
    } catch {
      return false;
    }
  }

  function directoryExists(relativePath: string): boolean {
    try {
      const fullPath = path.join(workspaceRoot, relativePath);
      return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
    } catch {
      return false;
    }
  }

  function findCsFileInDir(relativePath: string): string | null {
    try {
      const fullPath = path.join(workspaceRoot, relativePath);
      const fileName = fs.readdirSync(fullPath).find(file => file.endsWith('.cs'));
      if (!fileName) {
        return null;
      }
      return path.join(relativePath, fileName);
    } catch {
      return null;
    }
  }

  return {
    fileExists,
    directoryExists,
    findCsFileInDir,
  };
}

export function normalizePathSlashes(value: string): string {
  return value.replace(/\\/g, '/');
}

export function toWorkspaceAbsolute(workspaceRoot: string, relativePath: string): string {
  return normalizePathSlashes(path.join(workspaceRoot, relativePath));
}

export function toWorkspaceRelative(workspaceRoot: string, filePath: string): string {
  if (filePath.startsWith(workspaceRoot)) {
    return normalizePathSlashes(path.relative(workspaceRoot, filePath));
  }
  return normalizePathSlashes(filePath);
}
