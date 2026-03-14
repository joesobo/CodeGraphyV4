import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { WorkspaceAnalyzer } from '../../src/extension/WorkspaceAnalyzer';

Object.defineProperty(vscode.workspace, 'workspaceFolders', {
  get: () => [{ uri: vscode.Uri.file('/test/workspace'), name: 'workspace', index: 0 }],
  configurable: true,
});

describe('WorkspaceAnalyzer pre-analysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads duplicate relative paths only once before notifyPreAnalyze', async () => {
    const analyzer = new WorkspaceAnalyzer({
      subscriptions: [],
      extensionUri: vscode.Uri.file('/test/extension'),
      workspaceState: {
        get: vi.fn(() => undefined),
        update: vi.fn(() => Promise.resolve()),
      },
    } as unknown as vscode.ExtensionContext);
    const analyzerPrivate = analyzer as unknown as {
      _discovery: {
        readContent: (file: { relativePath: string }) => Promise<string>;
      };
      _registry: {
        notifyPreAnalyze: (files: unknown[], workspaceRoot: string) => Promise<void>;
      };
      _preAnalyzePlugins: (
        files: Array<{ absolutePath: string; relativePath: string }>,
        workspaceRoot: string
      ) => Promise<void>;
    };
    const readContent = vi.fn(async (file: { relativePath: string }) => `content:${file.relativePath}`);
    const notifyPreAnalyze = vi.fn(async () => {});

    analyzerPrivate._discovery.readContent = readContent;
    analyzerPrivate._registry.notifyPreAnalyze = notifyPreAnalyze;

    await analyzerPrivate._preAnalyzePlugins([
      { absolutePath: '/test/workspace/src/index.ts', relativePath: 'src/index.ts' },
      { absolutePath: '/test/workspace/duplicate/src/index.ts', relativePath: 'src/index.ts' },
    ], '/test/workspace');

    expect(readContent).toHaveBeenCalledTimes(1);
    expect(notifyPreAnalyze).toHaveBeenCalledWith([
      {
        absolutePath: '/test/workspace/src/index.ts',
        relativePath: 'src/index.ts',
        content: 'content:src/index.ts',
      },
      {
        absolutePath: '/test/workspace/duplicate/src/index.ts',
        relativePath: 'src/index.ts',
        content: 'content:src/index.ts',
      },
    ], '/test/workspace');
  });
});
