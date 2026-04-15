import type { IFileAnalysisResult } from '../../../core/plugins/types/contracts';
import type { FileAnalysisRow } from './cacheRows';
import { readOptionalNumber, readRequiredString } from './cacheRowValues';

export function createSnapshotFileEntry(
  row: FileAnalysisRow,
):
  | {
      filePath: string;
      mtime: number;
      size?: number;
      analysis: IFileAnalysisResult;
    }
  | undefined {
  const filePath = readRequiredString(row.filePath);
  const analysisText = readRequiredString(row.analysis);

  if (!filePath || !analysisText) {
    return undefined;
  }

  return {
    filePath,
    mtime: Number(row.mtime ?? 0),
    size: readOptionalNumber(row.size),
    analysis: JSON.parse(analysisText) as IFileAnalysisResult,
  };
}
