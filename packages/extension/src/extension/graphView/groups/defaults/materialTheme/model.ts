import type {
  MaterialExtensionMatcher,
  MaterialIconManifest,
  MaterialThemePathMatchers,
} from '@codegraphy-dev/graph-renderer/visuals';

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
