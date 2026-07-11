/**
 * @fileoverview Directory tree walker for file discovery.
 * @module core/discovery/file/walk
 */

import * as fs from 'fs';
import * as path from 'path';
import { throwIfAborted } from '../abort';
import { shouldSkipKnownDirectory } from '../pathMatching';

type WalkFileCallback = (
  relativePath: string,
  absolutePath: string,
  siblingNames: ReadonlySet<string>,
) => boolean;
type WalkDirectoryListener = (
  relativePath: string,
  absolutePath: string,
  siblingNames: ReadonlySet<string>,
) => boolean | void;
type DirectoryListenerOrSignal = WalkDirectoryListener | AbortSignal;

interface WalkDirectoryContext {
  onDirectory?: WalkDirectoryListener;
  onFile: WalkFileCallback;
  rootPath: string;
  signal?: AbortSignal;
}

interface WalkDirectoryEntry {
  absolutePath: string;
  relativePath: string;
}

function resolveWalkOptions(
  onDirectoryOrSignal?: DirectoryListenerOrSignal,
  nextSignal?: AbortSignal,
): Pick<WalkDirectoryContext, 'onDirectory' | 'signal'> {
  return typeof onDirectoryOrSignal === 'function'
    ? { onDirectory: onDirectoryOrSignal, signal: nextSignal }
    : { signal: onDirectoryOrSignal };
}

async function readDirectoryEntries(currentPath: string): Promise<fs.Dirent[]> {
  try {
    return await fs.promises.readdir(currentPath, { withFileTypes: true });
  } catch {
    return [];
  }
}

function resolveDirectoryEntryPaths(
  rootPath: string,
  currentPath: string,
  entry: fs.Dirent,
): WalkDirectoryEntry {
  const absolutePath = path.join(currentPath, entry.name);
  return {
    absolutePath,
    relativePath: path.relative(rootPath, absolutePath),
  };
}

async function walkChildDirectory(
  context: WalkDirectoryContext,
  entry: WalkDirectoryEntry,
  siblingNames: ReadonlySet<string>,
): Promise<boolean> {
  if (shouldSkipKnownDirectory(entry.relativePath)) {
    return true;
  }

  if (context.onDirectory?.(entry.relativePath, entry.absolutePath, siblingNames) === false) {
    return true;
  }
  return walkDirectory(
    context.rootPath,
    entry.absolutePath,
    context.onFile,
    context.onDirectory,
    context.signal,
  );
}

async function walkEntry(
  context: WalkDirectoryContext,
  currentPath: string,
  entry: fs.Dirent,
  siblingNames: ReadonlySet<string>,
): Promise<boolean> {
  throwIfAborted(context.signal);

  const walkEntryPaths = resolveDirectoryEntryPaths(context.rootPath, currentPath, entry);
  if (entry.isDirectory()) {
    return walkChildDirectory(context, walkEntryPaths, siblingNames);
  }

  return entry.isFile()
    ? context.onFile(walkEntryPaths.relativePath, walkEntryPaths.absolutePath, siblingNames)
    : true;
}

/**
 * Recursively walks a directory, calling the callback for each file.
 * @returns false if walking should stop, true otherwise
 */
export async function walkDirectory(
  rootPath: string,
  currentPath: string,
  onFile: WalkFileCallback,
  onDirectoryOrSignal?: DirectoryListenerOrSignal,
  nextSignal?: AbortSignal,
): Promise<boolean> {
  const { onDirectory, signal } = resolveWalkOptions(onDirectoryOrSignal, nextSignal);
  const context: WalkDirectoryContext = {
    onDirectory,
    onFile,
    rootPath,
    signal,
  };

  throwIfAborted(signal);

  const entries = await readDirectoryEntries(currentPath);
  const siblingNames = new Set(entries.map(entry => entry.name));
  for (const entry of entries) {
    const shouldContinue = await walkEntry(context, currentPath, entry, siblingNames);
    if (!shouldContinue) {
      return false;
    }
  }

  return true;
}
