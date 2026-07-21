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

export function createSnapshotFileEntry(row: FileRow): SnapshotFileEntry | undefined {
  const filePath = readRequiredString(row.path);
  const analysisPath = readRequiredString(row.analysisPath);
  if (!filePath || !analysisPath) return undefined;

  const analysis: IFileAnalysisResult = {
    filePath: analysisPath,
    nodes: [],
    symbols: [],
    relations: [],
  };

  const contentHash = readOptionalString(row.contentHash);
  const size = readOptionalNumber(row.size);
  return {
    filePath,
    mtime: Number(row.mtime ?? 0),
    ...(size !== undefined && size >= 0 ? { size } : {}),
    ...(contentHash ? { contentHash } : {}),
    analysis,
  };
}
