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

function packageIncludes(packageName: string): string[] {
  return unique(
    baseTestRoots(packageName).flatMap((root) => [
      `${root}/**/*.test.ts`,
      `${root}/**/*.test.tsx`,
    ]),
  );
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
  const dottedRelativePath = relativeSourceFile
    .slice(0, -extension.length)
    .split('/')
    .join('.');
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
        `${root}/${dottedRelativePath}.test.ts`,
        `${root}/${dottedRelativePath}.test.tsx`,
        `${root}/${dottedRelativePath}.mutations.test.ts`,
        `${root}/${dottedRelativePath}.mutations.test.tsx`,
        ...sharedDetectorTestIncludes(root, directory),
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
        `${root}/**/${dottedRelativePath}.test.ts`,
        `${root}/**/${dottedRelativePath}.test.tsx`,
        `${root}/**/${dottedRelativePath}.mutations.test.ts`,
        `${root}/**/${dottedRelativePath}.mutations.test.tsx`,
        ...sharedDetectorTestIncludes(root, directory, true),
        `${root}/**/${name}/**/*.test.ts`,
        `${root}/**/${name}/**/*.test.tsx`,
      ];
    }),
  );
}

function sharedDetectorTestIncludes(root: string, directory: string, recursive = false): string[] {
  if (directory !== 'sources') {
    return [];
  }

  const prefix = recursive ? `${root}/**/` : `${root}/`;
  return [
    `${prefix}ruleDetectors.test.ts`,
    `${prefix}ruleDetectors.test.tsx`,
    `${prefix}*Detectors.test.ts`,
    `${prefix}*Detectors.test.tsx`,
  ];
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
  if (!target.packageName) {
    return undefined;
  }

  if (target.kind === 'package') {
    return packageIncludes(target.packageName);
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
