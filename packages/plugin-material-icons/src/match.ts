import type { MaterialExtensionMatcher } from './extensionMatch';
import type { MaterialIconManifest, MaterialMatch, MaterialThemePathMatchers } from './model';
import { matchMaterialFileExtension } from './fileExtension';
import { matchMaterialFileName } from './fileName';
import { matchMaterialFolderName } from './folderName';
import { matchMaterialLanguageFallback } from './languageFallback';
import { getMaterialBaseName } from './paths';

export function findMaterialMatch(
  nodeId: string,
  manifest: MaterialIconManifest,
  options?: {
    extensionMatcher?: MaterialExtensionMatcher;
    nodeType?: 'file' | 'folder';
    pathMatchers?: MaterialThemePathMatchers;
  },
): MaterialMatch | undefined {
  return options?.nodeType === 'folder'
    ? findFolderMaterialMatch(nodeId, manifest, options.pathMatchers)
    : findFileMaterialMatch(nodeId, manifest, options?.pathMatchers, options?.extensionMatcher);
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
  extensionMatcher: MaterialExtensionMatcher | undefined,
): MaterialMatch | undefined {
  const baseName = getMaterialBaseName(nodeId);
  if (!baseName) {
    return undefined;
  }

  return findFileNameMaterialMatch(nodeId, manifest, pathMatchers)
    ?? findFileExtensionMaterialMatch(baseName, manifest, extensionMatcher)
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
  extensionMatcher: MaterialExtensionMatcher | undefined,
): MaterialMatch | undefined {
  return manifest.fileExtensions
    ? matchMaterialFileExtension(baseName, manifest.fileExtensions, extensionMatcher)
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
