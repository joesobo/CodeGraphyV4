import { AsyncLocalStorage } from 'node:async_hooks';
import * as fs from 'node:fs';

export interface TreeSitterPathHost {
  exists(absolutePath: string): boolean;
  isDirectory(absolutePath: string): boolean;
  isFile(absolutePath: string): boolean;
  listDirectory(absolutePath: string): readonly string[] | null;
  readTextFile(absolutePath: string): string | null;
}

const treeSitterPathHostStorage = new AsyncLocalStorage<TreeSitterPathHost>();

function getTreeSitterPathHost(): TreeSitterPathHost | undefined {
  return treeSitterPathHostStorage.getStore();
}

export function withTreeSitterPathHost<T>(
  pathHost: TreeSitterPathHost | undefined,
  callback: () => T,
): T {
  if (!pathHost) {
    return callback();
  }

  return treeSitterPathHostStorage.run(pathHost, callback);
}

export function treeSitterPathExists(absolutePath: string): boolean {
  const pathHost = getTreeSitterPathHost();
  return pathHost ? pathHost.exists(absolutePath) : fs.existsSync(absolutePath);
}

export function treeSitterPathIsFile(absolutePath: string): boolean {
  const pathHost = getTreeSitterPathHost();
  return pathHost
    ? pathHost.isFile(absolutePath)
    : fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile();
}

export function treeSitterPathIsDirectory(absolutePath: string): boolean {
  const pathHost = getTreeSitterPathHost();
  return pathHost
    ? pathHost.isDirectory(absolutePath)
    : fs.existsSync(absolutePath) && fs.statSync(absolutePath).isDirectory();
}

export function treeSitterReadDirectory(absolutePath: string): readonly string[] {
  const pathHost = getTreeSitterPathHost();
  if (pathHost) {
    return pathHost.listDirectory(absolutePath) ?? [];
  }

  try {
    return fs.readdirSync(absolutePath);
  } catch {
    return [];
  }
}

export function treeSitterReadTextFile(absolutePath: string): string | null {
  const pathHost = getTreeSitterPathHost();
  if (pathHost) {
    return pathHost.readTextFile(absolutePath);
  }

  try {
    return fs.readFileSync(absolutePath, 'utf8');
  } catch {
    return null;
  }
}
