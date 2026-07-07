import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { z } from 'zod';
import { unknownRecordSchema } from '../../../../../shared/values';
import type { MaterialThemeCacheEntry, MaterialIconManifest } from './model';
import { createMaterialExtensionMatcher } from './extensionMatch';
import { createMaterialPathRuleMatcher } from './pathMatch';

const materialThemeCache = new Map<string, MaterialThemeCacheEntry | null>();
const materialIconThemePackageName = 'material-icon-theme';

const materialStringRecordSchema = unknownRecordSchema.transform((record): Record<string, string> =>
  Object.fromEntries(
    Object.entries(record).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  )
);

const materialIconDefinitionSchema = z.looseObject({
  iconPath: z.string(),
});

const materialIconDefinitionsSchema = unknownRecordSchema.transform((record): MaterialIconManifest['iconDefinitions'] =>
  Object.fromEntries(
    Object.entries(record).flatMap(([key, value]) => {
      const parsed = materialIconDefinitionSchema.safeParse(value);
      return parsed.success ? [[key, { iconPath: parsed.data.iconPath }] as [string, { iconPath: string }]] : [];
    }),
  )
);

const materialIconManifestSchema = z.looseObject({
  fileExtensions: materialStringRecordSchema.optional().catch(undefined),
  fileNames: materialStringRecordSchema.optional().catch(undefined),
  folder: z.string().optional().catch(undefined),
  folderNames: materialStringRecordSchema.optional().catch(undefined),
  folderNamesExpanded: materialStringRecordSchema.optional().catch(undefined),
  iconDefinitions: materialIconDefinitionsSchema.optional().catch(undefined),
  languageIds: materialStringRecordSchema.optional().catch(undefined),
  rootFolder: z.string().optional().catch(undefined),
}).transform((manifest): MaterialIconManifest => {
  const normalized: MaterialIconManifest = {};
  if (manifest.fileExtensions !== undefined) {
    normalized.fileExtensions = manifest.fileExtensions;
  }
  if (manifest.fileNames !== undefined) {
    normalized.fileNames = manifest.fileNames;
  }
  if (manifest.folder !== undefined) {
    normalized.folder = manifest.folder;
  }
  if (manifest.folderNames !== undefined) {
    normalized.folderNames = manifest.folderNames;
  }
  if (manifest.folderNamesExpanded !== undefined) {
    normalized.folderNamesExpanded = manifest.folderNamesExpanded;
  }
  if (manifest.iconDefinitions !== undefined) {
    normalized.iconDefinitions = manifest.iconDefinitions;
  }
  if (manifest.languageIds !== undefined) {
    normalized.languageIds = manifest.languageIds;
  }
  if (manifest.rootFolder !== undefined) {
    normalized.rootFolder = manifest.rootFolder;
  }
  return normalized;
});

export function clearMaterialThemeCache(): void {
  materialThemeCache.clear();
}

function readMaterialIconManifest(manifestPath: string): MaterialIconManifest | null {
  try {
    const parsed = materialIconManifestSchema.safeParse(JSON.parse(fs.readFileSync(manifestPath, 'utf8')));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function resolveMaterialThemeRoot(extensionUri: vscode.Uri): string | undefined {
  const candidates = [
    path.join(extensionUri.fsPath, 'packages', 'extension', 'node_modules', materialIconThemePackageName),
    path.join(extensionUri.fsPath, 'dist', 'node_modules', materialIconThemePackageName),
  ];

  return candidates.find((candidate) => fs.existsSync(path.join(candidate, 'package.json')));
}

export function loadMaterialTheme(extensionUri: vscode.Uri): MaterialThemeCacheEntry | null {
  const cacheKey = extensionUri.fsPath;
  const cached = materialThemeCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const packageRoot = resolveMaterialThemeRoot(extensionUri);
  if (!packageRoot) {
    materialThemeCache.set(cacheKey, null);
    return null;
  }

  const manifestPath = path.join(packageRoot, 'dist', 'material-icons.json');
  if (!fs.existsSync(manifestPath)) {
    materialThemeCache.set(cacheKey, null);
    return null;
  }

  const manifest = readMaterialIconManifest(manifestPath);
  if (!manifest) {
    materialThemeCache.set(cacheKey, null);
    return null;
  }

  const theme = {
    extensionMatcher: manifest.fileExtensions
      ? createMaterialExtensionMatcher(manifest.fileExtensions)
      : undefined,
    iconDataByName: new Map(),
    manifest,
    manifestPath,
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
  } satisfies MaterialThemeCacheEntry;

  materialThemeCache.set(cacheKey, theme);
  return theme;
}
