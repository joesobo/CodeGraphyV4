import * as path from 'node:path';
import { findExistingFile } from './analyze/existingFile';

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
  return findExistingFile([
    ...IMPORT_RESOLUTION_EXTENSIONS.map((extension) => `${basePath}${extension}`),
    ...IMPORT_RESOLUTION_EXTENSIONS.slice(1).map((extension) => path.join(basePath, `index${extension}`)),
  ]);
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
