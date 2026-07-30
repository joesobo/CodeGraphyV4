import * as vscode from 'vscode';
import type { GraphViewProvider } from '../../graphViewProvider';
import { handleCodeGraphyAgentUri } from './handle';

export function createCodeGraphyAgentUriHandler(
  provider: Pick<GraphViewProvider, 'refresh'>,
): vscode.UriHandler {
  return {
    handleUri: async (uri: vscode.Uri): Promise<void> => {
      await handleCodeGraphyAgentUri(uri, provider);
    },
  };
}
