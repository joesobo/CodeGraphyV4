import { sharedDetectorTestIncludes, type FileIncludeParts } from './includeParts';

function ancestorFeatureIncludes(root: string, parts: FileIncludeParts): string[] {
  const segments = parts.directory.split('/').filter(Boolean);

  return segments.flatMap((_segment, index) => {
    const featureSegments = segments.slice(0, segments.length - index);
    const featureName = featureSegments.at(-1);
    if (!featureName) {
      return [];
    }

    const featureDirectory = featureSegments.slice(0, -1).join('/');
    const prefix = featureDirectory ? `${featureDirectory}/` : '';
    return [
      `${root}/${prefix}${featureName}.test.ts`,
      `${root}/${prefix}${featureName}.test.tsx`,
      `${root}/${prefix}${featureName}.mutations.test.ts`,
      `${root}/${prefix}${featureName}.mutations.test.tsx`,
    ];
  });
}

export function directIncludes(root: string, parts: FileIncludeParts): string[] {
  return [
    `${root}/${parts.relativeTestDirectory}**/*.test.ts`,
    `${root}/${parts.relativeTestDirectory}**/*.test.tsx`,
    `${root}/${parts.relativeTestDirectory}**/*.mutations.test.ts`,
    `${root}/${parts.relativeTestDirectory}**/*.mutations.test.tsx`,
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
    ...ancestorFeatureIncludes(root, parts),
    ...sharedDetectorTestIncludes(root, parts.directory),
  ];
}
