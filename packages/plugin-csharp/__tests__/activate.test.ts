import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fixtureWorkspacePath = path.resolve(__dirname, '../examples');

const mockState = vi.hoisted(() => ({
  getExtension: vi.fn(),
  registerWebviewViewProvider: vi.fn(() => ({ dispose: vi.fn() })),
  registerCommand: vi.fn(() => ({ dispose: vi.fn() })),
  getConfiguration: vi.fn(),
  fsStat: vi.fn(),
  workspaceFoldersValue: undefined as
    | Array<{ uri: { fsPath: string; path: string }; name: string; index: number }>
    | undefined,
}));

vi.mock('vscode', () => ({
  Uri: {
    file: (filePath: string) => ({ fsPath: filePath, path: filePath }),
    joinPath: (base: { path: string }, ...segments: string[]) => ({
      fsPath: [base.path, ...segments].join('/'),
      path: [base.path, ...segments].join('/'),
    }),
  },
  extensions: {
    getExtension: mockState.getExtension,
    all: [],
  },
  window: {
    registerWebviewViewProvider: mockState.registerWebviewViewProvider,
    showInformationMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    onDidChangeActiveTextEditor: vi.fn(() => ({ dispose: vi.fn() })),
  },
  commands: {
    registerCommand: mockState.registerCommand,
    executeCommand: vi.fn(),
  },
  workspace: {
    getConfiguration: mockState.getConfiguration,
    onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
    onDidSaveTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
    createFileSystemWatcher: vi.fn(() => ({
      onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
      onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
      onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
      dispose: vi.fn(),
    })),
    get workspaceFolders() {
      return mockState.workspaceFoldersValue;
    },
    fs: {
      stat: mockState.fsStat,
    },
  },
}));

import * as vscode from 'vscode';

function createContext() {
  return {
    subscriptions: [] as { dispose: () => void }[],
    extensionUri: vscode.Uri.file('/test/extension'),
    workspaceState: {
      get: vi.fn(() => undefined),
      update: vi.fn(() => Promise.resolve()),
    },
  };
}

function getRegisteredProvider() {
  return mockState.registerWebviewViewProvider.mock.calls[0]?.[1];
}

describe('plugin-csharp/activate', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockState.workspaceFoldersValue = [
      { uri: vscode.Uri.file(fixtureWorkspacePath), name: 'workspace', index: 0 },
    ];

    mockState.getConfiguration.mockReturnValue({
      get: vi.fn((_key: string, defaultValue: unknown) => defaultValue),
      inspect: vi.fn(() => undefined),
      update: vi.fn(),
    });

    mockState.fsStat.mockImplementation(async (uri: { fsPath: string }) => {
      const stat = await fs.stat(uri.fsPath);
      return {
        mtime: stat.mtimeMs,
        size: stat.size,
      };
    });
  });

  it('registers the C# plugin with the core extension', async () => {
    const registerPlugin = vi.fn();
    mockState.getExtension.mockReturnValue({
      isActive: false,
      activate: vi.fn(async () => ({ registerPlugin })),
    });

    const { activate } = await import('../src/activate');
    const context = { extensionUri: { fsPath: '/plugins/csharp' } };

    await activate(context as never);

    expect(mockState.getExtension).toHaveBeenCalledWith('codegraphy.codegraphy');
    expect(registerPlugin).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'codegraphy.csharp' }),
      { extensionUri: context.extensionUri },
    );
  });

  it('returns without registering when the core extension is unavailable', async () => {
    mockState.getExtension.mockReturnValue(undefined);

    const { activate } = await import('../src/activate');

    await expect(activate({ extensionUri: { fsPath: '/plugins/csharp' } } as never)).resolves.toBeUndefined();
  });

  it('establishes C# connections when installed with the core extension', async () => {
    const { activate: activateCore } = await import('../../extension/src/extension/activate');
    const { getGraphViewProviderInternals } = await import(
      '../../extension/tests/extension/graphViewProvider/internals'
    );

    const api = activateCore(createContext() as never);
    mockState.getExtension.mockReturnValue({
      id: 'codegraphy.codegraphy',
      isActive: true,
      exports: api,
    });

    const { activate } = await import('../src/activate');
    await activate({ extensionUri: vscode.Uri.file('/plugins/csharp') } as never);

    const provider = getRegisteredProvider();
    const internals = getGraphViewProviderInternals(provider);
    await internals._analysisMethods._analyzeAndSendData();

    expect(api.getGraphData().edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          from: 'src/Program.cs',
          to: 'src/Services/ApiService.cs',
        }),
      ]),
    );
  });
});
