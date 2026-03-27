import { readdirSync } from 'fs';
import { resolve } from 'path';

export interface DirectoryEntry {
  directoryPath: string;
  files: string[];
  subdirectories: string[];
}

function isHidden(name: string): boolean {
  return name.startsWith('.');
}

function isExcludedDirectory(name: string): boolean {
  if (isHidden(name)) {
    return true;
  }
  return name === 'node_modules';
}

function isTypeScriptOrJavaScriptFile(name: string): boolean {
  return /\.(ts|tsx|js|jsx)$/.test(name);
}

function walkDirectoriesRecursive(directoryPath: string, entries: DirectoryEntry[]): void {
  const items = readdirSync(directoryPath, { withFileTypes: true });

  const files: string[] = [];
  const subdirectories: string[] = [];

  for (const item of items) {
    if (item.isFile() && isTypeScriptOrJavaScriptFile(item.name)) {
      files.push(item.name);
    } else if (item.isDirectory() && !isExcludedDirectory(item.name)) {
      subdirectories.push(item.name);
    }
  }

  files.sort();
  subdirectories.sort();

  entries.push({
    directoryPath,
    files,
    subdirectories
  });

  for (const subdirectory of subdirectories) {
    const subdirectoryPath = resolve(directoryPath, subdirectory);
    walkDirectoriesRecursive(subdirectoryPath, entries);
  }
}

export function walkDirectories(rootPath: string): DirectoryEntry[] {
  const entries: DirectoryEntry[] = [];
  walkDirectoriesRecursive(rootPath, entries);
  entries.sort((left, right) => left.directoryPath.localeCompare(right.directoryPath));
  return entries;
}
