import type { IDiscoveredFile } from '../../../core/discovery/contracts';
import { throwIfWorkspaceAnalysisAborted } from '../abort';

export interface WorkspaceAnalyzerPreAnalyzeDependencies {
  notifyPreAnalyze(
    files: Array<{
      absolutePath: string;
      content: string;
      relativePath: string;
    }>,
    workspaceRoot: string,
  ): Promise<void>;
  readContent(file: IDiscoveredFile): Promise<string>;
}

export async function preAnalyzeWorkspaceAnalyzerFiles(
  files: IDiscoveredFile[],
  workspaceRoot: string,
  dependencies: WorkspaceAnalyzerPreAnalyzeDependencies,
  signal?: AbortSignal,
): Promise<void> {
  throwIfWorkspaceAnalysisAborted(signal);

  const contentByRelativePath = new Map<string, Promise<string>>();
  const getFileContent = (file: IDiscoveredFile): Promise<string> => {
    const cached = contentByRelativePath.get(file.relativePath);
    if (cached) {
      return cached;
    }

    const contentPromise = dependencies.readContent(file);
    contentByRelativePath.set(file.relativePath, contentPromise);
    return contentPromise;
  };

  const v2Files = await Promise.all(
    files.map(async file => ({
      absolutePath: file.absolutePath,
      relativePath: file.relativePath,
      content: await getFileContent(file),
    })),
  );
  await dependencies.notifyPreAnalyze(v2Files, workspaceRoot);
}
