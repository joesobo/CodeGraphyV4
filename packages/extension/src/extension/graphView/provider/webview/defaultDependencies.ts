import * as vscode from 'vscode';
import {
  createGraphViewHtml,
  createGraphViewNonce,
  type CodeGraphyWebviewThemeKind,
} from '../../webview/html';
import { openGraphViewInEditor } from '../../editorPanel';
import {
  setGraphViewProviderMessageListener,
  type GraphViewProviderMessageListenerSource,
} from '../../webview/providerMessages/listener';
import { resolveGraphViewWebviewView } from '../../webview/resolve';
import {
  onGraphViewWebviewMessage,
  sendGraphViewWebviewMessage,
} from '../../webview/bridge';

export interface GraphViewProviderWebviewMethodDependencies {
  viewType: string;
  createHtml(extensionUri: vscode.Uri, webview: vscode.Webview): string;
  resolveWebviewView: typeof resolveGraphViewWebviewView;
  openInEditor: typeof openGraphViewInEditor;
  sendWebviewMessage: typeof sendGraphViewWebviewMessage;
  onWebviewMessage: typeof onGraphViewWebviewMessage;
  setWebviewMessageListener(
    webview: vscode.Webview,
    source: GraphViewProviderMessageListenerSource,
  ): void;
  executeCommand(command: string, key: string, value: boolean): Thenable<unknown>;
  createPanel: typeof vscode.window.createWebviewPanel;
  getWorkspaceTitle?(): string | undefined;
}

function getActiveGraphViewThemeKind(): CodeGraphyWebviewThemeKind {
  const themeKind = (
    vscode.window as typeof vscode.window & {
      activeColorTheme?: { kind?: vscode.ColorThemeKind };
    }
  ).activeColorTheme?.kind;
  const colorThemeKind = (
    vscode as typeof vscode & {
      ColorThemeKind?: typeof vscode.ColorThemeKind & {
        HighContrastLight?: vscode.ColorThemeKind;
      };
    }
  ).ColorThemeKind;

  if (themeKind === colorThemeKind?.Light) {
    return 'light';
  }

  if (
    themeKind === colorThemeKind?.HighContrast
    || themeKind === colorThemeKind?.HighContrastLight
  ) {
    return 'high-contrast';
  }

  return 'dark';
}

export function createDefaultGraphViewProviderWebviewMethodDependencies(): GraphViewProviderWebviewMethodDependencies {
  return {
    viewType: 'codegraphy.graphView',
    createHtml: (extensionUri, webview) =>
      createGraphViewHtml(
        extensionUri,
        webview,
        createGraphViewNonce(),
        getActiveGraphViewThemeKind(),
        process.env.CODEGRAPHY_ACCEPTANCE === '1',
      ),
    resolveWebviewView: resolveGraphViewWebviewView,
    openInEditor: openGraphViewInEditor,
    sendWebviewMessage: sendGraphViewWebviewMessage,
    onWebviewMessage: onGraphViewWebviewMessage,
    setWebviewMessageListener: (webview, source) =>
      setGraphViewProviderMessageListener(webview, source),
    executeCommand: (command, key, value) => vscode.commands.executeCommand(command, key, value),
    createPanel: (viewType, title, column, options) =>
      vscode.window.createWebviewPanel(viewType, title, column, options),
    getWorkspaceTitle: () => vscode.workspace.workspaceFolders?.[0]?.name,
  };
}

export type { GraphViewProviderMessageListenerSource };
