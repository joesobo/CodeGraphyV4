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
};

export const commands = {
  registerCommand: vi.fn(),
  executeCommand: vi.fn(),
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
