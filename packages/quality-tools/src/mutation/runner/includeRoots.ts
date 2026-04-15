import { normalizeSourcePathForTests } from './includeParts';

export function baseTestRoots(packageName: string): string[] {
  return [`packages/${packageName}/tests`];
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function packageIncludes(packageName: string): string[] {
  return unique(
    baseTestRoots(packageName).flatMap((root) => [
      `${root}/**/*.test.ts`,
      `${root}/**/*.test.tsx`,
    ]),
  );
}

export function directoryIncludes(packageName: string, relativeSourceDirectory: string): string[] {
  const normalizedSourceDirectory = normalizeSourcePathForTests(relativeSourceDirectory);

  return unique(
    baseTestRoots(packageName).flatMap((root) => [
      `${root}/${normalizedSourceDirectory}/**/*.test.ts`,
      `${root}/${normalizedSourceDirectory}/**/*.test.tsx`,
    ]),
  );
}
