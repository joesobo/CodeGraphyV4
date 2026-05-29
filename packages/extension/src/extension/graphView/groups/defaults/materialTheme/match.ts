import type { MaterialIconManifest, MaterialMatch, MaterialThemePathMatchers } from './model';
import { matchMaterialFileExtension } from './fileExtension';
import { matchMaterialFileName } from './fileName';
import { matchMaterialFolderName } from './folderName';
import { matchMaterialLanguageFallback } from './languageFallback';
import { getMaterialBaseName } from './paths';

export function findMaterialMatch(
  nodeId: string,
  manifest: MaterialIconManifest,
  options?: { nodeType?: 'file' | 'folder'; pathMatchers?: MaterialThemePathMatchers },
): MaterialMatch | undefined {
  return options?.nodeType === 'folder'
    ? findFolderMaterialMatch(nodeId, manifest, options.pathMatchers)
    : findFileMaterialMatch(nodeId, manifest, options?.pathMatchers);
}

function findFolderMaterialMatch(
  nodeId: string,
  manifest: MaterialIconManifest,
  pathMatchers: MaterialThemePathMatchers | undefined,
): MaterialMatch | undefined {
  return manifest.folderNames
    ? matchMaterialFolderName(
      nodeId,
      manifest.folderNames,
      manifest.folderNamesExpanded,
      pathMatchers,
    )
    : undefined;
}

function findFileMaterialMatch(
  nodeId: string,
  manifest: MaterialIconManifest,
  pathMatchers: MaterialThemePathMatchers | undefined,
): MaterialMatch | undefined {
  const baseName = getMaterialBaseName(nodeId);
  if (!baseName) {
    return undefined;
  }

  return findFileNameMaterialMatch(nodeId, manifest, pathMatchers)
    ?? findFileExtensionMaterialMatch(baseName, manifest)
    ?? findLanguageMaterialMatch(baseName, manifest);
}

function findFileNameMaterialMatch(
  nodeId: string,
  manifest: MaterialIconManifest,
  pathMatchers: MaterialThemePathMatchers | undefined,
): MaterialMatch | undefined {
  return manifest.fileNames
    ? matchMaterialFileName(nodeId, manifest.fileNames, pathMatchers?.fileNames)
    : undefined;
}

function findFileExtensionMaterialMatch(
  baseName: string,
  manifest: MaterialIconManifest,
): MaterialMatch | undefined {
  return manifest.fileExtensions
    ? matchMaterialFileExtension(baseName, manifest.fileExtensions)
    : undefined;
}

function findLanguageMaterialMatch(
  baseName: string,
  manifest: MaterialIconManifest,
): MaterialMatch | undefined {
  return manifest.languageIds
    ? matchMaterialLanguageFallback(baseName, manifest.languageIds)
    : undefined;
}
