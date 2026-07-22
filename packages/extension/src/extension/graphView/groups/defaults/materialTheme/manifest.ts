import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { MaterialThemeCacheEntry, MaterialIconManifest } from './model';
import { createMaterialExtensionMatcher } from './extensionMatch';
import { createMaterialPathRuleMatcher } from './pathMatch';
import { materialIconManifestSchema } from './schema';

const materialThemeCache = new Map<string, MaterialThemeCacheEntry | null>();
const materialIconThemePackageName = 'material-icon-theme';

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

  const theme = loadUncachedMaterialTheme(extensionUri);
  materialThemeCache.set(cacheKey, theme);
  return theme;
}

function loadUncachedMaterialTheme(extensionUri: vscode.Uri): MaterialThemeCacheEntry | null {
  const packageRoot = resolveMaterialThemeRoot(extensionUri);
  if (!packageRoot) {
    return null;
  }

  const manifestPath = path.join(packageRoot, 'dist', 'material-icons.json');
  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  const manifest = readMaterialIconManifest(manifestPath);
  if (!manifest) {
    return null;
  }

  return createMaterialTheme(manifest, manifestPath);
}

function createMaterialTheme(
  manifest: MaterialIconManifest,
  manifestPath: string,
): MaterialThemeCacheEntry {
  return {
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
  };
}
