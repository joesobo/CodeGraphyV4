import fs from 'node:fs';
import path from 'node:path';
import type { IDiscoveredFile } from '@codegraphy-dev/core';

export interface ChangedFileDiscoveryState {
  directories: string[];
  files: IDiscoveredFile[];
}

interface ReusableChangedFileDiscoveryInput {
  filePaths: readonly string[];
  lastDiscoveredDirectories: readonly string[];
  lastDiscoveredFiles: IDiscoveredFile[];
  lastWorkspaceRoot: string;
  toWorkspaceRelativePath(workspaceRoot: string, filePath: string): string | undefined;
  workspaceRoot: string;
}

export function getReusableChangedFileDiscoveryState(
  input: ReusableChangedFileDiscoveryInput,
): ChangedFileDiscoveryState | undefined {
  if (!hasReusableChangedFileDiscoveryState(input)) {
    return undefined;
  }

  const discoveredByRelativePath = createDiscoveredFilesByRelativePath(input.lastDiscoveredFiles);

  for (const filePath of input.filePaths) {
    if (!canReuseChangedFileDiscovery(filePath, discoveredByRelativePath, input)) {
      return undefined;
    }
  }

  return {
    directories: [...input.lastDiscoveredDirectories],
    files: input.lastDiscoveredFiles,
  };
}

function hasReusableChangedFileDiscoveryState(input: ReusableChangedFileDiscoveryInput): boolean {
  return input.filePaths.length > 0
    && input.lastWorkspaceRoot === input.workspaceRoot
    && input.lastDiscoveredFiles.length > 0;
}

function createDiscoveredFilesByRelativePath(
  discoveredFiles: readonly IDiscoveredFile[],
): Map<string, IDiscoveredFile> {
  return new Map(
    discoveredFiles.map(file => [
      normalizeGraphMetricFilePath(file.relativePath),
      file,
    ]),
  );
}

function canReuseChangedFileDiscovery(
  filePath: string,
  discoveredByRelativePath: ReadonlyMap<string, IDiscoveredFile>,
  input: ReusableChangedFileDiscoveryInput,
): boolean {
  const relativePath = input.toWorkspaceRelativePath(input.workspaceRoot, filePath);
  return Boolean(
    relativePath
    && discoveredByRelativePath.has(relativePath)
    && fs.existsSync(toAbsoluteChangedFilePath(input.workspaceRoot, filePath)),
  );
}

function toAbsoluteChangedFilePath(workspaceRoot: string, filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.join(workspaceRoot, filePath);
}

function normalizeGraphMetricFilePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}
