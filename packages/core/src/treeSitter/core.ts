import type {
  IAnalysisFile,
  IFileAnalysisResult,
  IPluginAnalysisContext,
} from '@codegraphy-dev/plugin-api';
import { analyzeFileWithTreeSitter } from './runtime/analyze';
import {
  listTreeSitterEdgeTypeCapabilities,
  listTreeSitterGraphScopeCapabilities,
} from './runtime/capabilities';
import { preAnalyzeCSharpTreeSitterFiles } from './runtime/csharpIndex';
import {
  preAnalyzeColdTreeSitterFiles,
  takeColdTreeSitterAnalysis,
} from './runtime/coldAnalysis/cache';

export function listCoreTreeSitterEdgeTypeCapabilities(filePaths?: readonly string[]) {
  return listTreeSitterEdgeTypeCapabilities(filePaths);
}

export function listCoreTreeSitterGraphScopeCapabilities(filePaths?: readonly string[]) {
  return listTreeSitterGraphScopeCapabilities(filePaths);
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
  const precomputedColdAnalysis = takeColdTreeSitterAnalysis(filePath, content);
  const coldAnalysis = options ? undefined : precomputedColdAnalysis;
  const analysis = coldAnalysis ?? (options
    ? await analyzeFileWithTreeSitter(filePath, content, workspaceRoot, options)
    : await analyzeFileWithTreeSitter(filePath, content, workspaceRoot));

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
  options: { cold?: boolean } = {},
): Promise<void> {
  await preAnalyzeCSharpTreeSitterFiles(files, workspaceRoot);
  if (options.cold) {
    await preAnalyzeColdTreeSitterFiles(files, workspaceRoot);
  }
}
