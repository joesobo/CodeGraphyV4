import type * as vscode from 'vscode';
import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import { resolveCssSnippetStylesheets } from '../../cssSnippets/resolve';
import type {
  GraphViewSettingsMessageHandlers,
  GraphViewSettingsMessageState,
} from './router';

function createWebviewUriAdapter(
  state: GraphViewSettingsMessageState,
) {
  if (!state.asWebviewUri) {
    return undefined;
  }

  return {
    asWebviewUri: (uri: vscode.Uri) => state.asWebviewUri?.(uri),
  };
}

export async function applyCssSnippetMessage(
  message: WebviewToExtensionMessage,
  state: GraphViewSettingsMessageState,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  if (message.type !== 'UPDATE_CSS_SNIPPET') {
    return false;
  }

  const snippets = {
    ...handlers.getConfig<Record<string, boolean>>('cssSnippets', {}),
    [message.payload.path]: message.payload.enabled,
  };
  await handlers.updateConfig('cssSnippets', snippets);

  handlers.sendMessage({
    type: 'CSS_SNIPPETS_UPDATED',
    payload: {
      snippets,
      stylesheets: state.workspaceRoot
        ? resolveCssSnippetStylesheets({
          snippets,
          webview: createWebviewUriAdapter(state),
          workspaceRoot: state.workspaceRoot,
        })
        : [],
    },
  });

  return true;
}
