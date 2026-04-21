export interface MaterialIconManifest {
  fileExtensions?: Record<string, string>;
  fileNames?: Record<string, string>;
  iconDefinitions?: Record<string, { iconPath: string }>;
  languageIds?: Record<string, string>;
}

export interface MaterialIconData {
  color: string;
  imageUrl: string;
}

export interface MaterialThemeCacheEntry {
  iconDataByName: Map<string, MaterialIconData>;
  manifest: MaterialIconManifest;
  manifestPath: string;
}

export interface MaterialMatch {
  iconName: string;
  key: string;
  kind: 'fileExtension' | 'fileName';
}

export const DEFAULT_MATERIAL_COLOR = '#90A4AE';
