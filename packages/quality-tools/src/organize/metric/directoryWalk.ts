import { readdirSync } from 'fs';
import { resolve } from 'path';

export interface DirectoryEntry {
  directoryPath: string;
  files: string[];
  subdirectories: string[];
}

export function sortDirectoryNames(names: string[]): string[] {
  return [...names].sort();
}

export function sortDirectoryEntries(entries: DirectoryEntry[]): DirectoryEntry[] {
  return [...entries].sort((left, right) => left.directoryPath.localeCompare(right.directoryPath));
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

  const sortedFiles = sortDirectoryNames(files);
  const sortedSubdirectories = sortDirectoryNames(subdirectories);

  entries.push({
    directoryPath,
    files: sortedFiles,
    subdirectories: sortedSubdirectories
  });

  for (const subdirectory of sortedSubdirectories) {
    const subdirectoryPath = resolve(directoryPath, subdirectory);
    walkDirectoriesRecursive(subdirectoryPath, entries);
  }
}

export function walkDirectories(rootPath: string): DirectoryEntry[] {
  const entries: DirectoryEntry[] = [];
  walkDirectoriesRecursive(rootPath, entries);
  return sortDirectoryEntries(entries);
}
