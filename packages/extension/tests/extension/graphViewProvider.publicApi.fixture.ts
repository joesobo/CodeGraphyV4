import { vi } from 'vitest';
import * as vscode from 'vscode';
import { GraphViewProvider } from '../../src/extension/graphViewProvider';
import { getGraphViewProviderInternals } from './graphViewProvider/internals';

export { GraphViewProvider, getGraphViewProviderInternals, vscode };

let workspaceFoldersValue:
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


export function resetGraphViewProviderPublicApi(): void {
  workspaceFoldersValue = [
    { uri: vscode.Uri.file('/test/workspace'), name: 'workspace', index: 0 },
  ];
  vi.clearAllMocks();
}
