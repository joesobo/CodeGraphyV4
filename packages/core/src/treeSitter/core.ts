import type {
  IAnalysisFile,
  IFileAnalysisResult,
  IPluginAnalysisContext,
} from '@codegraphy-dev/plugin-api';
import { analyzeFileWithTreeSitter } from './runtime/analyze';
import { listTreeSitterEdgeTypeCapabilities } from './runtime/capabilities';
import { preAnalyzeCSharpTreeSitterFiles } from './runtime/csharpIndex';

export function listCoreTreeSitterEdgeTypeCapabilities(filePaths?: readonly string[]) {
  return listTreeSitterEdgeTypeCapabilities(filePaths);
}

export async function analyzeFileWithCoreTreeSitter(
  filePath: string,
  content: string,
  workspaceRoot: string,
  context?: IPluginAnalysisContext,
): Promise<IFileAnalysisResult> {
  const options = context?.features?.symbols === false
    ? { includeSymbols: false }
    : undefined;
  const analysis = options
    ? await analyzeFileWithTreeSitter(filePath, content, workspaceRoot, options)
    : await analyzeFileWithTreeSitter(filePath, content, workspaceRoot);

  return analysis ?? {
    filePath,
    edgeTypes: [],
    nodeTypes: [],
    nodes: [],
    relations: [],
    symbols: [],
  };
}

export async function preAnalyzeCoreTreeSitterFiles(
  files: IAnalysisFile[],
  workspaceRoot: string,
): Promise<void> {
  await preAnalyzeCSharpTreeSitterFiles(files, workspaceRoot);
}
