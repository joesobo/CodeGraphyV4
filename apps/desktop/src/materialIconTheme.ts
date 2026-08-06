import {
  createMaterialExtensionMatcher,
  createMaterialPathRuleMatcher,
  extractPrimaryColor,
  findMaterialMatch,
  MATERIAL_TRANSPARENT_NODE_COLOR,
  toSvgDataUrl,
  toWhiteSvg,
} from '@codegraphy-dev/graph-visuals';
import type { MaterialIconManifest } from '@codegraphy-dev/graph-visuals';

const MATERIAL_MANIFEST_URL = './material-icons/dist/material-icons.json';
const MATERIAL_ASSET_ROOT = './material-icons/';

type MaterialIconMode = 'file' | 'folder';

type MaterialIconDefinition = NonNullable<MaterialIconManifest['iconDefinitions']>[string];

interface MaterialTheme {
  extensionMatcher?: ReturnType<typeof createMaterialExtensionMatcher>;
  manifest: MaterialIconManifest;
  pathMatchers: {
    fileNames?: ReturnType<typeof createMaterialPathRuleMatcher>;
    folderNames?: ReturnType<typeof createMaterialPathRuleMatcher>;
    folderNamesExpanded?: ReturnType<typeof createMaterialPathRuleMatcher>;
  };
}

export interface MaterialIconData {
  color: string;
  imageUrl: string;
  mode: MaterialIconMode;
}

let themePromise: Promise<MaterialTheme> | undefined;
const iconCache = new Map<string, Promise<MaterialIconData | undefined>>();
const matchCache = new Map<string, Promise<MaterialIconData | undefined>>();

export function clearMaterialIconThemeCache(): void {
  themePromise = undefined;
  iconCache.clear();
  matchCache.clear();
}

export function resolveMaterialIcon(
  nodePath: string,
  mode: MaterialIconMode,
): Promise<MaterialIconData | undefined> {
  const cacheKey = `${mode}:${nodePath}`;
  const cached = matchCache.get(cacheKey);
  if (cached) return cached;

  const resolution = resolveUncachedMaterialIcon(nodePath, mode);
  matchCache.set(cacheKey, resolution);
  return resolution;
}

async function resolveUncachedMaterialIcon(
  nodePath: string,
  mode: MaterialIconMode,
): Promise<MaterialIconData | undefined> {
  const theme = await loadMaterialTheme();
  const match = findMaterialMatch(nodePath, theme.manifest, {
    extensionMatcher: theme.extensionMatcher,
    nodeType: mode,
    pathMatchers: theme.pathMatchers,
  });
  const iconName = match?.iconName ?? (mode === 'folder' ? theme.manifest.folder : undefined);
  if (!iconName) return undefined;

  const cacheKey = `${mode}:${iconName}`;
  const cached = iconCache.get(cacheKey);
  if (cached) return cached;

  const resolution = resolveMatchedIcon(theme.manifest, iconName, mode);
  iconCache.set(cacheKey, resolution);
  return resolution;
}

async function resolveMatchedIcon(
  manifest: MaterialIconManifest,
  iconName: string,
  mode: MaterialIconMode,
): Promise<MaterialIconData | undefined> {
  const iconPath = manifest.iconDefinitions?.[iconName]?.iconPath;
  if (!iconPath) return undefined;

  const iconUrl = resolveIconUrl(iconPath);
  const response = await fetch(iconUrl);
  if (!response.ok) {
    throw new Error(`Material icon request failed with status ${response.status}.`);
  }

  const svg = await response.text();
  return mode === 'folder'
    ? { color: MATERIAL_TRANSPARENT_NODE_COLOR, imageUrl: toSvgDataUrl(svg), mode }
    : {
        color: extractPrimaryColor(svg),
        imageUrl: toSvgDataUrl(toWhiteSvg(svg)),
        mode,
      };
}

function loadMaterialTheme(): Promise<MaterialTheme> {
  themePromise ??= loadUncachedMaterialTheme();
  return themePromise;
}

async function loadUncachedMaterialTheme(): Promise<MaterialTheme> {
  const response = await fetch(MATERIAL_MANIFEST_URL);
  if (!response.ok) {
    throw new Error(`Material Icon Theme manifest request failed with status ${response.status}.`);
  }

  const manifest = parseMaterialIconManifest(await response.json());
  return {
    extensionMatcher: manifest.fileExtensions
      ? createMaterialExtensionMatcher(manifest.fileExtensions)
      : undefined,
    manifest,
    pathMatchers: {
      fileNames: manifest.fileNames
        ? createMaterialPathRuleMatcher(manifest.fileNames)
        : undefined,
      folderNames: manifest.folderNames
        ? createMaterialPathRuleMatcher(manifest.folderNames)
        : undefined,
      folderNamesExpanded: manifest.folderNamesExpanded
        ? createMaterialPathRuleMatcher(manifest.folderNamesExpanded)
        : undefined,
    },
  };
}

function parseMaterialIconManifest(value: unknown): MaterialIconManifest {
  if (!isRecord(value)) {
    throw new Error('Material Icon Theme manifest must be an object.');
  }

  return compactManifest({
    fileExtensions: parseOptionalStringRecord(value, 'fileExtensions'),
    fileNames: parseOptionalStringRecord(value, 'fileNames'),
    folder: parseOptionalString(value, 'folder'),
    folderNames: parseOptionalStringRecord(value, 'folderNames'),
    folderNamesExpanded: parseOptionalStringRecord(value, 'folderNamesExpanded'),
    iconDefinitions: parseOptionalIconDefinitions(value.iconDefinitions),
    languageIds: parseOptionalStringRecord(value, 'languageIds'),
    rootFolder: parseOptionalString(value, 'rootFolder'),
  });
}

function compactManifest(manifest: MaterialIconManifest): MaterialIconManifest {
  return {
    ...(manifest.fileExtensions !== undefined
      ? { fileExtensions: manifest.fileExtensions }
      : {}),
    ...(manifest.fileNames !== undefined ? { fileNames: manifest.fileNames } : {}),
    ...(manifest.folder !== undefined ? { folder: manifest.folder } : {}),
    ...(manifest.folderNames !== undefined ? { folderNames: manifest.folderNames } : {}),
    ...(manifest.folderNamesExpanded !== undefined
      ? { folderNamesExpanded: manifest.folderNamesExpanded }
      : {}),
    ...(manifest.iconDefinitions !== undefined
      ? { iconDefinitions: manifest.iconDefinitions }
      : {}),
    ...(manifest.languageIds !== undefined ? { languageIds: manifest.languageIds } : {}),
    ...(manifest.rootFolder !== undefined ? { rootFolder: manifest.rootFolder } : {}),
  };
}

function parseOptionalString(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new Error(`Material Icon Theme manifest field "${key}" must be a string.`);
  }
  return value;
}

function parseOptionalStringRecord(
  record: Record<string, unknown>,
  key: string,
): Record<string, string> | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    throw new Error(`Material Icon Theme manifest field "${key}" must be an object.`);
  }

  const parsed: Record<string, string> = {};
  for (const [entryKey, entryValue] of Object.entries(value)) {
    if (typeof entryValue !== 'string') {
      throw new Error(`Material Icon Theme manifest field "${key}.${entryKey}" must be a string.`);
    }
    parsed[entryKey] = entryValue;
  }
  return parsed;
}

function parseOptionalIconDefinitions(
  value: unknown,
): Record<string, MaterialIconDefinition> | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    throw new Error('Material Icon Theme manifest field "iconDefinitions" must be an object.');
  }

  const definitions: Record<string, MaterialIconDefinition> = {};
  for (const [iconName, definition] of Object.entries(value)) {
    if (!isRecord(definition) || typeof definition.iconPath !== 'string') {
      throw new Error(
        `Material Icon Theme manifest field "iconDefinitions.${iconName}.iconPath" must be a string.`,
      );
    }
    definitions[iconName] = { iconPath: definition.iconPath };
  }
  return definitions;
}

function resolveIconUrl(iconPath: string): string {
  const assetRoot = new URL(MATERIAL_ASSET_ROOT, document.baseURI);
  const manifestUrl = new URL(MATERIAL_MANIFEST_URL, document.baseURI);
  const iconUrl = new URL(iconPath, manifestUrl);
  if (iconUrl.origin !== assetRoot.origin || !iconUrl.pathname.startsWith(assetRoot.pathname)) {
    throw new Error('Material Icon Theme manifest contains an icon path outside staged assets.');
  }
  return iconUrl.href;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
