import { baseTestRoots } from './includeRoots';
import { directIncludes } from './directIncludes';
import { fallbackIncludes } from './fallbackIncludes';
import { fileIncludeParts } from './includeParts';

export function fileIncludes(packageName: string, relativeSourceFile: string): string[] {
  const parts = fileIncludeParts(relativeSourceFile);

  return [...new Set(
    baseTestRoots(packageName).flatMap((root) => {
      return [
        ...directIncludes(root, parts),
        ...fallbackIncludes(root, parts),
      ];
    }),
  )];
}
