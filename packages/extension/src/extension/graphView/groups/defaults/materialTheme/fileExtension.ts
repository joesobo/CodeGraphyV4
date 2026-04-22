import type { MaterialMatch } from './model';
import { findLongestExtensionMatch } from './extensionMatch';

export function matchMaterialFileExtension(
  baseName: string,
  fileExtensions: Record<string, string>,
): MaterialMatch | undefined {
  return findLongestExtensionMatch(baseName, Object.entries(fileExtensions));
}
