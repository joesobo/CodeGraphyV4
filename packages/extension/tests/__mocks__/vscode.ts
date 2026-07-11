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
  registerUriHandler: vi.fn(),
  showInformationMessage: vi.fn(),
  showErrorMessage: vi.fn(),
  showWarningMessage: vi.fn(),
  onDidChangeActiveTextEditor: vi.fn(() => ({ dispose: vi.fn() })),
};

export const commands = {
  registerCommand: vi.fn(),
  executeCommand: vi.fn(),
};

export class Position {
  constructor(
    public readonly line: number,
    public readonly character: number,
  ) {}
}

export class Range {
  constructor(
    public readonly start: Position,
    public readonly end: Position,
  ) {}
}

export const workspace = {
  getConfiguration: vi.fn(() => ({
    get: vi.fn(),
    inspect: vi.fn(() => undefined),
    update: vi.fn(),
  })),
  onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
  onDidSaveTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
  onDidCreateFiles: vi.fn(() => ({ dispose: vi.fn() })),
  onDidDeleteFiles: vi.fn(() => ({ dispose: vi.fn() })),
  onDidRenameFiles: vi.fn(() => ({ dispose: vi.fn() })),
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

export const extensions = {
  getExtension: vi.fn(),
  all: [] as unknown[],
};

export const languages = {
  getDiagnostics: vi.fn(() => []),
  onDidChangeDiagnostics: vi.fn(() => ({ dispose: vi.fn() })),
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

export enum ConfigurationTarget {
  Global = 1,
  Workspace = 2,
  WorkspaceFolder = 3,
}

export enum FileType {
  Unknown = 0,
  File = 1,
  Directory = 2,
  SymbolicLink = 64,
}
