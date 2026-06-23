import type { MaterialMatch } from './model';
import {
  createMaterialExtensionMatcher,
  findLongestExtensionMatchWithMatcher,
  type MaterialExtensionMatcher,
} from './extensionMatch';

export function matchMaterialFileExtension(
  baseName: string,
  fileExtensions: Record<string, string>,
  matcher: MaterialExtensionMatcher = createMaterialExtensionMatcher(fileExtensions),
): MaterialMatch | undefined {
  return findLongestExtensionMatchWithMatcher(baseName, matcher);
}
