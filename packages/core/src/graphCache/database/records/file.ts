import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import type { FileAnalysisRow } from './contracts';
import { readOptionalNumber, readOptionalString, readRequiredString } from './values';

export function createSnapshotFileEntry(
  row: FileAnalysisRow,
):
  | {
      filePath: string;
      mtime: number;
      size?: number;
      contentHash?: string;
      analysis: IFileAnalysisResult;
    }
  | undefined {
  const filePath = readRequiredString(row.filePath);
  const analysisText = readRequiredString(row.analysis);

  if (!filePath || !analysisText) {
    return undefined;
  }

  const contentHash = readOptionalString(row.contentHash);
  return {
    filePath,
    mtime: Number(row.mtime ?? 0),
    size: readOptionalNumber(row.size),
    ...(contentHash ? { contentHash } : {}),
    analysis: JSON.parse(analysisText) as IFileAnalysisResult,
  };
}
