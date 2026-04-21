import type { MaterialIconManifest, MaterialMatch } from './model';
import { matchMaterialFileExtension } from './fileExtension';
import { matchMaterialFileName } from './fileName';
import { matchMaterialLanguageFallback } from './languageFallback';
import { getMaterialBaseName } from './paths';

export function findMaterialMatch(
  nodeId: string,
  manifest: MaterialIconManifest,
): MaterialMatch | undefined {
  const baseName = getMaterialBaseName(nodeId);
  if (!baseName) {
    return undefined;
  }

  const fileNameMatch = manifest.fileNames
    ? matchMaterialFileName(nodeId, manifest.fileNames)
    : undefined;
  if (fileNameMatch) {
    return fileNameMatch;
  }

  const fileExtensionMatch = manifest.fileExtensions
    ? matchMaterialFileExtension(baseName, manifest.fileExtensions)
    : undefined;
  if (fileExtensionMatch) {
    return fileExtensionMatch;
  }

  return manifest.languageIds
    ? matchMaterialLanguageFallback(baseName, manifest.languageIds)
    : undefined;
}
