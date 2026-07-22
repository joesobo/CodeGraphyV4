import { vi } from 'vitest';
import path from 'path';
import * as vscode from 'vscode';
import type { IFileAnalysisResult, IPlugin, IPluginAnalysisContext } from '../../../src/core/plugins/types/contracts';
import { WorkspacePipeline } from '../../../src/extension/pipeline/service/lifecycleFacade';
import {
  BASELINE_ANALYSIS_CACHE_TIER,
  SYMBOLS_ANALYSIS_CACHE_TIER,
  createPluginAnalysisCacheTier,
} from '../../../src/extension/pipeline/fileAnalysis';

export let workspaceFoldersValue:
  | Array<{ uri: { fsPath: string; path: string }; name: string; index: number }>
  | undefined;

Object.defineProperty(vscode.workspace, 'workspaceFolders', {
  get: () => workspaceFoldersValue,
  configurable: true,
});

export function createContext() {
  return {
    subscriptions: [],
    extensionUri: vscode.Uri.file('/test/extension'),
    workspaceState: {
      get: vi.fn(() => undefined),
      update: vi.fn(() => Promise.resolve()),
    },
  };
}

export function createPlugin(id: string, name: string, supportedExtensions: string[]): IPlugin {
  return {
    id,
    name,
    version: '1.0.0',
    apiVersion: '^4.0.0',
    supportedExtensions,
    analyzeFile: vi.fn(async (filePath: string) => ({ filePath, relations: [] })),
  } as IPlugin;
}

export function createDiscoveredFile(relativePath: string) {
  return {
    absolutePath: `/test/workspace/${relativePath}`,
    extension: path.extname(relativePath),
    name: path.basename(relativePath),
    relativePath,
  };
}

export function createEmptyAnalysisResult(
  filePath: string,
): IFileAnalysisResult {
  return {
    filePath,
    relations: [],
  };
}

export function createSymbolAnalysisResult(
  filePath: string,
): IFileAnalysisResult {
  return {
    filePath,
    relations: [],
    symbols: [
      {
        filePath,
        id: `${filePath}:function:run`,
        kind: 'function',
        name: 'run',
      },
    ],
  };
}

export function readCacheTiers(analysis: IFileAnalysisResult): string[] {
  return (analysis as IFileAnalysisResult & { cache?: { tiers?: string[] } }).cache?.tiers ?? [];
}

export function expectWorkspaceAnalysisContext(symbols: boolean): IPluginAnalysisContext {
  return expect.objectContaining({
    features: { symbols },
    fileSystem: expect.objectContaining({
      exists: expect.any(Function),
      isDirectory: expect.any(Function),
      isFile: expect.any(Function),
      listDirectory: expect.any(Function),
      readTextFile: expect.any(Function),
    }),
  }) as IPluginAnalysisContext;
}


export function clearWorkspaceFolders(): void {
  workspaceFoldersValue = undefined;
}

export function setUpAdapters(): void {
    workspaceFoldersValue = [
      { uri: vscode.Uri.file('/test/workspace'), name: 'workspace', index: 0 },
    ];
    vi.clearAllMocks();
  }

export {
  path,
  vscode,
  WorkspacePipeline,
  BASELINE_ANALYSIS_CACHE_TIER,
  SYMBOLS_ANALYSIS_CACHE_TIER,
  createPluginAnalysisCacheTier,
};
export type { IFileAnalysisResult, IPlugin, IPluginAnalysisContext };
