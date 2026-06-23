import type { MaterialMatch } from '../model';

export function getExtensionCandidates(lowerBaseName: string): string[] {
  const candidates = [lowerBaseName];
  for (let index = lowerBaseName.indexOf('.'); index >= 0; index = lowerBaseName.indexOf('.', index + 1)) {
    const extension = lowerBaseName.slice(index + 1);
    if (extension) {
      candidates.push(extension);
    }
  }

  return candidates;
}

export function createExtensionMatch(
  baseName: string,
  lowerBaseName: string,
  extension: string,
  iconName: string,
): MaterialMatch | undefined {
  const lowerExtension = extension.toLowerCase();
  if (!matchesExtension(lowerBaseName, lowerExtension)) {
    return undefined;
  }

  return {
    iconName,
    key: lowerBaseName === lowerExtension ? baseName : baseName.slice(-extension.length),
    kind: 'fileExtension',
  };
}

function matchesExtension(lowerBaseName: string, lowerExtension: string): boolean {
  return lowerBaseName === lowerExtension || lowerBaseName.endsWith(`.${lowerExtension}`);
}
