// Mock VSCode API for testing
export const Uri = {
  file: (path: string) => ({ fsPath: path, path }),
  joinPath: (base: { path: string }, ...segments: string[]) => ({
    fsPath: [base.path, ...segments].join('/'),
    path: [base.path, ...segments].join('/'),
  }),
};

export const window = {
  registerWebviewViewProvider: vi.fn(),
  showInformationMessage: vi.fn(),
  showErrorMessage: vi.fn(),
  onDidChangeActiveTextEditor: vi.fn(() => ({ dispose: vi.fn() })),
};

export const commands = {
  registerCommand: vi.fn(),
  executeCommand: vi.fn(),
};

export const workspace = {
  getConfiguration: vi.fn(() => ({
    get: vi.fn(),
  })),
  onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
  onDidSaveTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
  createFileSystemWatcher: vi.fn(() => ({
    onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
    onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
    onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
    dispose: vi.fn(),
  })),
  workspaceFolders: undefined,
  fs: {
    stat: vi.fn(),
  },
};

export const ExtensionContext = class {
  subscriptions: { dispose: () => void }[] = [];
  extensionUri = Uri.file('/test/extension');
};

export enum ViewColumn {
  Active = -1,
  Beside = -2,
  One = 1,
  Two = 2,
  Three = 3,
}
