import { dirname, extname, basename } from 'path';

const BROAD_FALLBACK_DISABLED_BASENAMES = new Set([
  'create',
  'runtime',
  'state',
]);

export interface FileIncludeParts {
  camelName: string;
  directory: string;
  dottedRelativePath: string;
  includeBroadFallback: boolean;
  name: string;
  relativeTestDirectory: string;
}

function toCamelCase(value: string): string {
  return value.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase());
}

export function sharedDetectorTestIncludes(root: string, directory: string, recursive = false): string[] {
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

export function fileIncludeParts(relativeSourceFile: string): FileIncludeParts {
  const directory = dirname(relativeSourceFile);
  const extension = extname(relativeSourceFile);
  const name = basename(relativeSourceFile, extension);

  return {
    camelName: toCamelCase(name),
    directory,
    dottedRelativePath: relativeSourceFile.slice(0, -extension.length).split('/').join('.'),
    includeBroadFallback: !BROAD_FALLBACK_DISABLED_BASENAMES.has(name),
    name,
    relativeTestDirectory: directory === '.' ? '' : `${directory}/`
  };
}
