import * as path from 'node:path';
import { getPythonSearchRoots } from '../projectRoots';
import { findExistingFile } from '../analyze/existingFile';

export function resolvePythonModulePath(
  filePath: string,
  workspaceRoot: string,
  specifier: string,
): string | null {
  const leadingDots = specifier.match(/^\.+/)?.[0].length ?? 0;
  const modulePath = specifier.slice(leadingDots).replace(/\./g, '/');

  const buildCandidates = (baseDirectoryPath: string): string[] => {
    if (!modulePath) {
      return [
        path.join(baseDirectoryPath, '__init__.py'),
      ];
    }

    return [
      path.join(baseDirectoryPath, `${modulePath}.py`),
      path.join(baseDirectoryPath, modulePath, '__init__.py'),
    ];
  };

  if (leadingDots > 0) {
    let baseDirectoryPath = path.dirname(filePath);
    for (let index = 1; index < leadingDots; index += 1) {
      baseDirectoryPath = path.dirname(baseDirectoryPath);
    }

    return findExistingFile(buildCandidates(baseDirectoryPath));
  }

  const searchRoots = getPythonSearchRoots(filePath, workspaceRoot);
  return findExistingFile(
    searchRoots.flatMap((searchRoot) => [
      ...buildCandidates(searchRoot),
      ...buildCandidates(path.join(searchRoot, 'src')),
    ]),
  );
}
