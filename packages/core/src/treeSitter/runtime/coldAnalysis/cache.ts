import type { IAnalysisFile, IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import { supportsTreeSitterFile } from '../languages/catalog';
import { analyzeColdTreeSitterFiles } from './pool';

interface CachedColdAnalysis {
  content: string;
  result: IFileAnalysisResult;
}

export type AnalyzeColdTreeSitterFiles = (
  files: IAnalysisFile[],
  workspaceRoot: string,
) => Promise<IFileAnalysisResult[]>;

const analysisByFilePath = new Map<string, CachedColdAnalysis>();

function supportsColdWorkerAnalysis(filePath: string): boolean {
  return supportsTreeSitterFile(filePath) && !filePath.toLowerCase().endsWith('.cs');
}

export function clearColdTreeSitterAnalysisCache(): void {
  analysisByFilePath.clear();
}

export async function preAnalyzeColdTreeSitterFiles(
  files: IAnalysisFile[],
  workspaceRoot: string,
  analyzeBatch: AnalyzeColdTreeSitterFiles = analyzeColdTreeSitterFiles,
): Promise<void> {
  clearColdTreeSitterAnalysisCache();
  const eligibleFiles = files.filter(file => supportsColdWorkerAnalysis(file.absolutePath));
  if (eligibleFiles.length < 2) {
    return;
  }

  const results = await analyzeBatch(eligibleFiles, workspaceRoot);
  const contentByFilePath = new Map(
    eligibleFiles.map(file => [file.absolutePath, file.content]),
  );
  for (const result of results) {
    const content = contentByFilePath.get(result.filePath);
    if (content !== undefined) {
      analysisByFilePath.set(result.filePath, { content, result });
    }
  }
}

export function takeColdTreeSitterAnalysis(
  filePath: string,
  content: string,
): IFileAnalysisResult | undefined {
  const cached = analysisByFilePath.get(filePath);
  analysisByFilePath.delete(filePath);
  return cached?.content === content ? cached.result : undefined;
}
