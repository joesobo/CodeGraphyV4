import { sharedDetectorTestIncludes, type FileIncludeParts } from './includeParts';

export function fallbackIncludes(root: string, parts: FileIncludeParts): string[] {
  if (!parts.includeBroadFallback) {
    return [];
  }

  return [
    `${root}/**/${parts.name}.test.ts`,
    `${root}/**/${parts.name}.test.tsx`,
    `${root}/**/${parts.name}.mutations.test.ts`,
    `${root}/**/${parts.name}.mutations.test.tsx`,
    `${root}/**/${parts.name}*.test.ts`,
    `${root}/**/${parts.name}*.test.tsx`,
    `${root}/**/${parts.dottedRelativePath}.test.ts`,
    `${root}/**/${parts.dottedRelativePath}.test.tsx`,
    `${root}/**/${parts.dottedRelativePath}.mutations.test.ts`,
    `${root}/**/${parts.dottedRelativePath}.mutations.test.tsx`,
    `${root}/**/${parts.camelName}Rule.test.ts`,
    `${root}/**/${parts.camelName}Rule.test.tsx`,
    ...sharedDetectorTestIncludes(root, parts.directory, true),
    `${root}/**/${parts.name}/**/*.test.ts`,
    `${root}/**/${parts.name}/**/*.test.tsx`,
  ];
}
