import path from 'node:path';
import type { IAnalysisFile, IPluginAnalysisFileSystem } from '@codegraphy-dev/plugin-api';

const GUID_PATTERN = /^guid:\s*([0-9a-fA-F]+)\s*$/m;
const IGNORED_META_SCAN_DIRECTORY_NAMES = new Set([
  '.codegraphy',
  '.git',
  '.gradle',
  '.idea',
  '.vs',
  'build',
  'builds',
  'library',
  'logs',
  'memorycaptures',
  'node_modules',
  'obj',
  'temp',
  'usersettings',
]);

export function buildUnityGuidMap(files: readonly IAnalysisFile[]): Map<string, string> {
  const guidToAssetPath = new Map<string, string>();

  for (const file of files) {
    registerUnityGuid(guidToAssetPath, file);
  }

  return guidToAssetPath;
}

export function registerUnityGuid(
  guidToAssetPath: Map<string, string>,
  file: IAnalysisFile,
): void {
  registerUnityGuidContent(guidToAssetPath, file.relativePath, file.content);
}

export async function buildUnityGuidMapFromWorkspace(
  workspaceRoot: string,
  fileSystem: IPluginAnalysisFileSystem,
): Promise<Map<string, string>> {
  const guidToAssetPath = new Map<string, string>();
  await scanUnityMetaDirectory(guidToAssetPath, workspaceRoot, workspaceRoot, fileSystem);
  return guidToAssetPath;
}

export function registerUnityGuidContent(
  guidToAssetPath: Map<string, string>,
  relativePath: string,
  content: string,
): void {
  if (!relativePath.endsWith('.meta')) {
    return;
  }

  const guid = readUnityGuid(content);
  if (!guid) {
    return;
  }

  guidToAssetPath.set(guid, normalizePath(relativePath.slice(0, -'.meta'.length)));
}

export function readUnityGuid(content: string): string | null {
  return GUID_PATTERN.exec(content)?.[1] ?? null;
}

async function scanUnityMetaDirectory(
  guidToAssetPath: Map<string, string>,
  workspaceRoot: string,
  directoryPath: string,
  fileSystem: IPluginAnalysisFileSystem,
): Promise<void> {
  const entries = await fileSystem.listDirectory(directoryPath);
  if (!entries) {
    return;
  }

  for (const entry of entries) {
    const absolutePath = path.join(directoryPath, entry);
    if (await shouldScanNestedDirectory(absolutePath, entry, fileSystem)) {
      await scanUnityMetaDirectory(guidToAssetPath, workspaceRoot, absolutePath, fileSystem);
      continue;
    }

    if (!entry.endsWith('.meta') || !(await fileSystem.isFile(absolutePath))) {
      continue;
    }

    const content = await fileSystem.readTextFile(absolutePath);
    if (content === null) {
      continue;
    }

    registerUnityGuidContent(
      guidToAssetPath,
      normalizePath(path.relative(workspaceRoot, absolutePath)),
      content,
    );
  }
}

async function shouldScanNestedDirectory(
  absolutePath: string,
  entryName: string,
  fileSystem: IPluginAnalysisFileSystem,
): Promise<boolean> {
  if (IGNORED_META_SCAN_DIRECTORY_NAMES.has(entryName.toLowerCase())) {
    return false;
  }
  return fileSystem.isDirectory(absolutePath);
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}
