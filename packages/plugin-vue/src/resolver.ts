import * as fs from 'node:fs';
import * as path from 'node:path';

const RELATIVE_SPECIFIER_PREFIXES = ['./', '../'] as const;
const EXTENSIONLESS_IMPORT_CANDIDATE_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.d.ts',
  '.mts',
  '.d.mts',
  '.cts',
  '.d.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
] as const;
const IMPORT_EXTENSION_SUBSTITUTIONS: Record<string, string[]> = {
  '.vue': ['.vue'],
  '.js': ['.ts', '.tsx', '.d.ts', '.js'],
  '.jsx': ['.tsx', '.d.ts', '.jsx'],
  '.mjs': ['.mts', '.d.mts', '.mjs'],
  '.cjs': ['.cts', '.d.cts', '.cjs'],
  '.ts': ['.ts'],
  '.tsx': ['.tsx'],
  '.mts': ['.mts'],
  '.cts': ['.cts'],
};

export function resolveVueScriptImport(filePath: string, specifier: string): string | null {
  if (!isRelativeSpecifier(specifier)) {
    return null;
  }

  return resolveExistingFile(path.resolve(path.dirname(filePath), specifier));
}

function isRelativeSpecifier(specifier: string): boolean {
  return RELATIVE_SPECIFIER_PREFIXES.some(prefix => specifier.startsWith(prefix));
}

function resolveExistingFile(basePath: string): string | null {
  const candidates = createExistingFileCandidates(basePath);
  return candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) ?? null;
}

function createExistingFileCandidates(basePath: string): string[] {
  const extension = path.extname(basePath);
  if (extension) {
    const extensionSubstitutions = IMPORT_EXTENSION_SUBSTITUTIONS[extension] ?? [extension];
    const pathWithoutExtension = basePath.slice(0, -extension.length);
    return extensionSubstitutions.map(candidateExtension => `${pathWithoutExtension}${candidateExtension}`);
  }

  return [
    basePath,
    ...EXTENSIONLESS_IMPORT_CANDIDATE_EXTENSIONS.map(candidateExtension => `${basePath}${candidateExtension}`),
    ...EXTENSIONLESS_IMPORT_CANDIDATE_EXTENSIONS.map(candidateExtension =>
      path.join(basePath, `index${candidateExtension}`)
    ),
  ];
}
