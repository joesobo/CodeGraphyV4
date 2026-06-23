import * as vscode from 'vscode';
import {
  createGraphViewHtml,
  createGraphViewNonce,
  type CodeGraphyWebviewKind,
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
import { recordExtensionPerformanceEvent } from '../../../performance/marks';

export interface GraphViewProviderWebviewMethodDependencies {
  viewType: string;
  createHtml(
    extensionUri: vscode.Uri,
    webview: vscode.Webview,
    viewKind: CodeGraphyWebviewKind,
  ): string;
  resolveWebviewView: typeof resolveGraphViewWebviewView;
  openInEditor: typeof openGraphViewInEditor;
  sendWebviewMessage: typeof sendGraphViewWebviewMessage;
  onWebviewMessage: typeof onGraphViewWebviewMessage;
  setWebviewMessageListener: typeof setGraphViewProviderMessageListener;
  executeCommand(command: string, key: string, value: boolean): Thenable<unknown>;
  recordPerformanceEvent?(name: string, detail?: Record<string, unknown>): void;
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
    createHtml: (extensionUri, webview, viewKind) =>
      createGraphViewHtml(
        extensionUri,
        webview,
        createGraphViewNonce(),
        viewKind,
        getActiveGraphViewThemeKind(),
        process.env.CODEGRAPHY_ACCEPTANCE === '1',
      ),
    resolveWebviewView: resolveGraphViewWebviewView,
    openInEditor: openGraphViewInEditor,
    sendWebviewMessage: sendGraphViewWebviewMessage,
    onWebviewMessage: onGraphViewWebviewMessage,
    setWebviewMessageListener: setGraphViewProviderMessageListener,
    executeCommand: (command, key, value) => vscode.commands.executeCommand(command, key, value),
    recordPerformanceEvent: recordExtensionPerformanceEvent,
    createPanel: (viewType, title, column, options) =>
      vscode.window.createWebviewPanel(viewType, title, column, options),
    getWorkspaceTitle: () => vscode.workspace.workspaceFolders?.[0]?.name,
  };
}

export type { GraphViewProviderMessageListenerSource };
