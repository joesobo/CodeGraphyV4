import * as path from 'path';
import { normalizePath } from '../parser';

export function isUserResourcePath(importPath: string): boolean {
  return importPath.startsWith('user://');
}

export function isRelativeImport(importPath: string): boolean {
  return importPath.startsWith('./') || importPath.startsWith('../');
}

export function isUnsupportedTextResourcePath(importPath: string): boolean {
  return !importPath
    || isUserResourcePath(importPath)
    || importPath.includes('://')
    || path.isAbsolute(importPath);
}

export function resolveResPath(resPath: string): string {
  const relativePath = resPath.slice('res://'.length);
  return normalizePath(relativePath);
}

export function resolveRelativePath(importPath: string, fromFile: string): string {
  const fromDir = path.dirname(fromFile);
  const resolved = path.join(fromDir, importPath);
  return normalizePath(resolved);
}
