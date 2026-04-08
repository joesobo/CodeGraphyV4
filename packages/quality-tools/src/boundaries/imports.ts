import { dirname, join } from 'path';

export function resolveImportTarget(
  fromFile: string,
  specifier: string,
  candidatePaths: Set<string>
): string | undefined {
  if (specifier[0] !== '.') {
    return undefined;
  }

  const basePath = join(dirname(fromFile), specifier);
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.jsx`,
    join(basePath, 'index.ts'),
    join(basePath, 'index.tsx'),
    join(basePath, 'index.js'),
    join(basePath, 'index.jsx')
  ];

  return candidates.find((candidate) => candidatePaths.has(candidate));
}
