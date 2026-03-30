import { dirname, extname, basename, posix } from 'path';
import { type QualityTarget } from '../../shared/resolve/target';

function baseTestRoots(packageName: string): string[] {
  return [
    `packages/${packageName}/tests`,
    `packages/${packageName}/__tests__`,
  ];
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

const BROAD_FALLBACK_DISABLED_BASENAMES = new Set([
  'create',
  'runtime',
  'state',
]);

function relativeSourcePath(target: QualityTarget): string | undefined {
  if (!target.packageRelativePath?.startsWith('src/')) {
    return undefined;
  }

  return target.packageRelativePath.slice('src/'.length);
}

function fileIncludes(packageName: string, relativeSourceFile: string): string[] {
  const directory = dirname(relativeSourceFile);
  const extension = extname(relativeSourceFile);
  const name = basename(relativeSourceFile, extension);
  const relativeTestDirectory = directory === '.' ? '' : `${directory}/`;
  const includeBroadFallback = !BROAD_FALLBACK_DISABLED_BASENAMES.has(name);

  return unique(
    baseTestRoots(packageName).flatMap((root) => {
      const includes = [
        `${root}/${relativeTestDirectory}${name}.test.ts`,
        `${root}/${relativeTestDirectory}${name}.test.tsx`,
        `${root}/${relativeTestDirectory}${name}.mutations.test.ts`,
        `${root}/${relativeTestDirectory}${name}.mutations.test.tsx`,
        `${root}/${relativeTestDirectory}${name}*.test.ts`,
        `${root}/${relativeTestDirectory}${name}*.test.tsx`,
        `${root}/${relativeTestDirectory}${name}/**/*.test.ts`,
        `${root}/${relativeTestDirectory}${name}/**/*.test.tsx`,
      ];

      if (!includeBroadFallback) {
        return includes;
      }

      return [
        ...includes,
        `${root}/**/${name}.test.ts`,
        `${root}/**/${name}.test.tsx`,
        `${root}/**/${name}.mutations.test.ts`,
        `${root}/**/${name}.mutations.test.tsx`,
        `${root}/**/${name}*.test.ts`,
        `${root}/**/${name}*.test.tsx`,
        `${root}/**/${name}/**/*.test.ts`,
        `${root}/**/${name}/**/*.test.tsx`,
      ];
    }),
  );
}

function directoryIncludes(packageName: string, relativeSourceDirectory: string): string[] {
  return unique(
    baseTestRoots(packageName).flatMap((root) => [
      `${root}/${relativeSourceDirectory}/**/*.test.ts`,
      `${root}/${relativeSourceDirectory}/**/*.test.tsx`,
    ]),
  );
}

export function resolveScopedVitestIncludes(target: QualityTarget): string[] | undefined {
  if (target.kind === 'package' || !target.packageName) {
    return undefined;
  }

  const relativeSource = relativeSourcePath(target);
  if (!relativeSource) {
    return undefined;
  }

  const normalizedSource = posix.normalize(relativeSource);
  if (target.kind === 'file') {
    return fileIncludes(target.packageName, normalizedSource);
  }

  return directoryIncludes(target.packageName, normalizedSource);
}
