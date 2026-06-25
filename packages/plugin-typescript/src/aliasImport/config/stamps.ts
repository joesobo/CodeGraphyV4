import * as fs from 'node:fs';

export type FileStamp = {
  mtimeMs: number;
  size: number;
} | null;

export function createConfigFileStamps(filePaths: ReadonlySet<string>): Map<string, FileStamp> {
  return new Map([...filePaths].map(filePath => [filePath, getFileStamp(filePath)]));
}

export function areConfigFileStampsFresh(stamps: ReadonlyMap<string, FileStamp>): boolean {
  for (const [filePath, stamp] of stamps) {
    if (!areFileStampsEqual(getFileStamp(filePath), stamp)) {
      return false;
    }
  }

  return true;
}

function getFileStamp(filePath: string): FileStamp {
  try {
    const stat = fs.statSync(filePath);
    return {
      mtimeMs: stat.mtimeMs,
      size: stat.size,
    };
  } catch {
    return null;
  }
}

function areFileStampsEqual(left: FileStamp, right: FileStamp): boolean {
  if (left === null || right === null) {
    return left === right;
  }

  return left.mtimeMs === right.mtimeMs && left.size === right.size;
}
