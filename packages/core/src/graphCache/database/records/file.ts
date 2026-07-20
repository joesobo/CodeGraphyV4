import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import type { FileRow } from './contracts';
import { readOptionalNumber, readOptionalString, readRequiredString } from './values';

export interface SnapshotFileEntry {
  filePath: string;
  mtime: number;
  size?: number;
  contentHash?: string;
  analysis: IFileAnalysisResult;
}

function indexedFlag(value: unknown): boolean {
  return value === 1 || value === 1n;
}

export function createSnapshotFileEntry(row: FileRow): SnapshotFileEntry | undefined {
  const filePath = readRequiredString(row.path);
  const analysisPath = readRequiredString(row.analysisPath);
  if (!filePath || !analysisPath) return undefined;

  const analysis: IFileAnalysisResult = { filePath: analysisPath };
  if (indexedFlag(row.nodesIndexed)) analysis.nodes = [];
  if (indexedFlag(row.symbolsIndexed)) analysis.symbols = [];
  if (indexedFlag(row.relationsIndexed)) analysis.relations = [];

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
