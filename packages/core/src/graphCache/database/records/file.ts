import * as path from 'node:path';
import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import type { FileRow } from './types';
import { readOptionalNumber, readOptionalString, readRequiredString } from './values';

export interface SnapshotFileEntry {
  filePath: string;
  mtime: number;
  size?: number;
  contentHash?: string;
  analysis: IFileAnalysisResult;
}

export function createSnapshotFileEntry(
  row: FileRow,
  workspaceRoot: string,
): SnapshotFileEntry | undefined {
  const filePath = readRequiredString(row.path);
  if (!filePath) return undefined;

  const contentHash = readOptionalString(row.contentHash);
  const mtime = readOptionalNumber(row.mtime) ?? 0;
  const size = readOptionalNumber(row.size);
  return {
    filePath,
    mtime,
    ...(size !== undefined && size >= 0 ? { size } : {}),
    ...(contentHash ? { contentHash } : {}),
    analysis: {
      filePath: path.resolve(workspaceRoot, filePath),
      nodes: [],
      symbols: [],
      relations: [],
    },
  };
}
