export function baseTestRoots(packageName: string): string[] {
  return [
    `packages/${packageName}/tests`,
    `packages/${packageName}/__tests__`,
  ];
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
  return unique(
    baseTestRoots(packageName).flatMap((root) => [
      `${root}/${relativeSourceDirectory}/**/*.test.ts`,
      `${root}/${relativeSourceDirectory}/**/*.test.tsx`,
    ]),
  );
}
