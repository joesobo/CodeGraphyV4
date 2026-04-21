import { getMaterialBaseName, normalizePathSeparators } from './paths';
import type { MaterialMatch } from './model';

export function matchMaterialFileName(
  nodeId: string,
  fileNames: Record<string, string>,
): MaterialMatch | undefined {
  let bestMatch: MaterialMatch | undefined;
  const normalizedNodeId = normalizePathSeparators(nodeId);
  const baseName = getMaterialBaseName(nodeId);

  for (const [fileName, iconName] of Object.entries(fileNames)) {
    const normalizedFileName = normalizePathSeparators(fileName);
    const matches = normalizedFileName.includes('/')
      ? normalizedNodeId === normalizedFileName || normalizedNodeId.endsWith(`/${normalizedFileName}`)
      : baseName === normalizedFileName;
    if (!matches) {
      continue;
    }

    if (!bestMatch || normalizedFileName.length > bestMatch.key.length) {
      bestMatch = {
        iconName,
        key: normalizedFileName,
        kind: 'fileName',
      };
    }
  }

  return bestMatch;
}
