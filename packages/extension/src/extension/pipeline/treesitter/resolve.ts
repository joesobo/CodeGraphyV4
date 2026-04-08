import * as fs from 'node:fs';
import * as path from 'node:path';

const IMPORT_RESOLUTION_EXTENSIONS = [
  '',
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
] as const;

function findExistingPath(basePath: string): string | null {
  for (const extension of IMPORT_RESOLUTION_EXTENSIONS) {
    const candidatePath = `${basePath}${extension}`;
    if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
      return candidatePath;
    }
  }

  for (const extension of IMPORT_RESOLUTION_EXTENSIONS.slice(1)) {
    const candidatePath = path.join(basePath, `index${extension}`);
    if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
      return candidatePath;
    }
  }

  return null;
}

export function resolveTreeSitterImportPath(
  filePath: string,
  specifier: string,
): string | null {
  if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
    return null;
  }

  const candidateBasePath = path.resolve(path.dirname(filePath), specifier);
  return findExistingPath(candidateBasePath);
}
