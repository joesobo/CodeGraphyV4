import type { MaterialExtensionMatcher } from './extensionMatch';
import type { MaterialPathRuleMatcher } from './pathMatch';

export interface MaterialIconManifest {
  fileExtensions?: Record<string, string>;
  fileNames?: Record<string, string>;
  folder?: string;
  folderNames?: Record<string, string>;
  folderNamesExpanded?: Record<string, string>;
  iconDefinitions?: Record<string, { iconPath: string }>;
  languageIds?: Record<string, string>;
  rootFolder?: string;
}

export interface MaterialIconData {
  color: string;
  imageUrl: string;
}

export interface MaterialThemeCacheEntry {
  extensionMatcher?: MaterialExtensionMatcher;
  iconDataByName: Map<string, MaterialIconData>;
  manifest: MaterialIconManifest;
  manifestPath: string;
  pathMatchers: MaterialThemePathMatchers;
}

export interface MaterialThemePathMatchers {
  fileNames?: MaterialPathRuleMatcher;
  folderNames?: MaterialPathRuleMatcher;
  folderNamesExpanded?: MaterialPathRuleMatcher;
}

export interface MaterialMatch {
  iconName: string;
  key: string;
  kind: 'fileExtension' | 'fileName' | 'folderName';
}

export const DEFAULT_MATERIAL_COLOR = '#90A4AE';
