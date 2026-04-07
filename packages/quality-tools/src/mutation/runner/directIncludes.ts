import { sharedDetectorTestIncludes, type FileIncludeParts } from './includeParts';

export function directIncludes(root: string, parts: FileIncludeParts): string[] {
  return [
    `${root}/${parts.relativeTestDirectory}${parts.name}.test.ts`,
    `${root}/${parts.relativeTestDirectory}${parts.name}.test.tsx`,
    `${root}/${parts.relativeTestDirectory}${parts.name}.mutations.test.ts`,
    `${root}/${parts.relativeTestDirectory}${parts.name}.mutations.test.tsx`,
    `${root}/${parts.relativeTestDirectory}${parts.name}*.test.ts`,
    `${root}/${parts.relativeTestDirectory}${parts.name}*.test.tsx`,
    `${root}/${parts.relativeTestDirectory}${parts.name}/**/*.test.ts`,
    `${root}/${parts.relativeTestDirectory}${parts.name}/**/*.test.tsx`,
    `${root}/${parts.dottedRelativePath}.test.ts`,
    `${root}/${parts.dottedRelativePath}.test.tsx`,
    `${root}/${parts.dottedRelativePath}.mutations.test.ts`,
    `${root}/${parts.dottedRelativePath}.mutations.test.tsx`,
    `${root}/${parts.relativeTestDirectory}${parts.camelName}Rule.test.ts`,
    `${root}/${parts.relativeTestDirectory}${parts.camelName}Rule.test.tsx`,
    ...sharedDetectorTestIncludes(root, parts.directory),
  ];
}
