/**
 * @fileoverview Directory tree walker for file discovery.
 * @module core/discovery/file/walk
 */

import * as fs from 'fs';
import * as path from 'path';
import { throwIfAborted } from '../abort';
import { shouldSkipKnownDirectory } from '../pathMatching';

type WalkDirectoryCallback = (
  relativePath: string,
  absolutePath: string,
) => boolean | Promise<boolean>;
type WalkDirectoryListener = (relativePath: string, absolutePath: string) => void;
type DirectoryListenerOrSignal = WalkDirectoryListener | AbortSignal;

interface WalkDirectoryContext {
  onDirectory?: WalkDirectoryListener;
  onFile: WalkDirectoryCallback;
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
): Promise<boolean> {
  if (shouldSkipKnownDirectory(entry.relativePath)) {
    return true;
  }

  context.onDirectory?.(entry.relativePath, entry.absolutePath);
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
): Promise<boolean> {
  throwIfAborted(context.signal);

  const walkEntryPaths = resolveDirectoryEntryPaths(context.rootPath, currentPath, entry);
  if (entry.isDirectory()) {
    return walkChildDirectory(context, walkEntryPaths);
  }

  return entry.isFile()
    ? context.onFile(walkEntryPaths.relativePath, walkEntryPaths.absolutePath)
    : true;
}

/**
 * Recursively walks a directory, calling the callback for each file.
 * @returns false if walking should stop, true otherwise
 */
export async function walkDirectory(
  rootPath: string,
  currentPath: string,
  onFile: WalkDirectoryCallback,
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

  for (const entry of await readDirectoryEntries(currentPath)) {
    const shouldContinue = await walkEntry(context, currentPath, entry);
    if (!shouldContinue) {
      return false;
    }
  }

  return true;
}
