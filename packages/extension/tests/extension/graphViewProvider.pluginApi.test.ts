import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createContext,
  GraphViewProvider,
  resetGraphViewProviderPublicApi,
  vscode,
} from './graphViewProvider.publicApi.fixture';

describe('GraphViewProvider public API', () => {
  beforeEach(resetGraphViewProviderPublicApi);

  it('registers plugin commands through the shared command registrar', () => {
    const context = createContext();
    const disposable = { dispose: vi.fn() };
    const registerCommandMock = vi.fn(() => disposable);
    (vscode.commands as Record<string, unknown>).registerCommand = registerCommandMock;

    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      context as unknown as vscode.ExtensionContext
    );

    provider.registerExternalPlugin({
      id: 'plugin.commands',
      name: 'Commands',
      version: '1.0.0',
      apiVersion: '^3.0.0',
      supportedExtensions: ['.ts'],
      analyzeFile: async (filePath: string) => ({ filePath, relations: [] }),
      onLoad: (api: { registerCommand: (command: { id: string; action: () => void }) => void }) => {
        api.registerCommand({
          id: 'plugin.commands.run',
          action: vi.fn(),
        });
      },
    });

    expect(registerCommandMock).toHaveBeenCalledWith(
      'plugin.commands.run',
      expect.any(Function)
    );
    expect(context.subscriptions).toContain(disposable);
  });
});
