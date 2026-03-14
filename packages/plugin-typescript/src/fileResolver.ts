import * as fs from 'fs';
import * as path from 'path';

const RESOLVE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'];

const INDEX_FILES = ['index.ts', 'index.tsx', 'index.js', 'index.jsx'];

export function fileExists(filePath: string): boolean {
  try {
    const stat = fs.statSync(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

export function resolveFile(basePath: string): string | null {
  if (fileExists(basePath)) {
    return basePath;
  }

  for (const ext of RESOLVE_EXTENSIONS) {
    const withExt = basePath + ext;
    if (fileExists(withExt)) {
      return withExt;
    }
  }

  for (const indexFile of INDEX_FILES) {
    const indexPath = path.join(basePath, indexFile);
    if (fileExists(indexPath)) {
      return indexPath;
    }
  }

  return null;
}
