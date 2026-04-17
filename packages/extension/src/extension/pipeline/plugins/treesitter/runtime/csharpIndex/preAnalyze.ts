import { createTreeSitterRuntime } from '../languages';
import { indexCSharpTree } from './tree';
import {
  clearCSharpWorkspaceIndex,
  createEmptyCSharpIndex,
  setCSharpWorkspaceIndex,
} from './store';

export interface PreAnalyzeFileInput {
  absolutePath: string;
  content: string;
}

export async function preAnalyzeCSharpTreeSitterFiles(
  files: PreAnalyzeFileInput[],
  workspaceRoot: string,
): Promise<void> {
  const csharpFiles = files.filter((file) => file.absolutePath.toLowerCase().endsWith('.cs'));
  if (csharpFiles.length === 0) {
    clearCSharpWorkspaceIndex(workspaceRoot);
    return;
  }

  const index = createEmptyCSharpIndex();

  for (const file of csharpFiles) {
    const runtime = await createTreeSitterRuntime(file.absolutePath);
    if (!runtime || runtime.languageKind !== 'csharp') {
      continue;
    }

    indexCSharpTree(runtime.parser.parse(file.content), file.absolutePath, index);
  }

  setCSharpWorkspaceIndex(workspaceRoot, index);
}
