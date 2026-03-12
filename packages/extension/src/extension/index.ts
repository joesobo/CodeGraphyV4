import * as vscode from 'vscode';
import * as path from 'path';
import { GraphViewProvider } from './GraphViewProvider';
import type { IGraphData } from '../shared/types';

/** Public API returned by activate() — usable from e2e tests. */
export interface CodeGraphyAPI {
  /** Current graph data (nodes + edges) after the last analysis. */
  getGraphData(): IGraphData;
  /** Send a raw message to the webview panel (mirrors extension→webview channel). */
  sendToWebview(message: unknown): void;
  /** Listen for messages sent from the webview. Returns a disposable. */
  onWebviewMessage(handler: (message: unknown) => void): vscode.Disposable;
  /** Register an external v2 plugin. */
  registerPlugin(plugin: unknown, options?: { extensionUri?: vscode.Uri | string }): void;
}

/**
 * Returns true when a saved document should not trigger graph re-analysis.
 * We skip workspace/config saves to avoid graph resets while changing settings.
 */
function shouldIgnoreSaveForGraphRefresh(document: vscode.TextDocument): boolean {
  const filePath = document.uri?.fsPath;
  if (!filePath) return false;

  const normalized = filePath.replace(/\\/g, '/');
  return (
    normalized.endsWith('/.vscode/settings.json') ||
    normalized.endsWith('/.vscode/tasks.json') ||
    normalized.endsWith('/.vscode/launch.json') ||
    normalized.endsWith('.code-workspace')
  );
}

export function activate(context: vscode.ExtensionContext): CodeGraphyAPI {
  const provider = new GraphViewProvider(context.extensionUri, context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      GraphViewProvider.viewType,
      provider
    )
  );

  // Listen for configuration changes
  // Physics-only changes should not trigger full re-analysis
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('codegraphy.physics')) {
        // Physics settings: only update physics, no re-analysis
        provider.refreshPhysicsSettings();
      } else if (
        event.affectsConfiguration('codegraphy.disabledRules') ||
        event.affectsConfiguration('codegraphy.disabledPlugins')
      ) {
        // Rule/plugin toggles are applied from cached analysis data.
        provider.refreshToggleSettings();
      } else if (
        event.affectsConfiguration('codegraphy.directionMode') ||
        event.affectsConfiguration('codegraphy.directionColor') ||
        event.affectsConfiguration('codegraphy.particleSpeed') ||
        event.affectsConfiguration('codegraphy.particleSize') ||
        event.affectsConfiguration('codegraphy.showLabels') ||
        event.affectsConfiguration('codegraphy.bidirectionalEdges')
      ) {
        // Display-only settings: resend display settings, no re-analysis or position reset
        provider.refreshSettings();
      } else if (
        event.affectsConfiguration('codegraphy.groups') ||
        event.affectsConfiguration('codegraphy.hiddenPluginGroups')
      ) {
        // Groups/hidden groups: already handled by the webview message handlers
        // (UPDATE_GROUPS, TOGGLE_PLUGIN_GROUP_DISABLED, etc.) which call _sendGroupsUpdated() directly.
        // No re-analysis needed — skip to avoid double refresh.
      } else if (event.affectsConfiguration('codegraphy')) {
        // All other codegraphy settings (filterPatterns, showOrphans, maxFiles, etc.)
        // require re-analysis because they affect which files/nodes are in the graph
        console.log('[CodeGraphy] Configuration changed, refreshing graph');
        void provider.refresh();
        provider.emitEvent('workspace:configChanged', { key: 'codegraphy', value: undefined, old: undefined });
        // Invalidate timeline cache when settings that affect analysis change
        if (
          event.affectsConfiguration('codegraphy.filterPatterns') ||
          event.affectsConfiguration('codegraphy.timeline.maxCommits')
        ) {
          void provider.invalidateTimelineCache();
        }
        // Send updated playback speed to webview (display-only, no cache invalidation)
        if (event.affectsConfiguration('codegraphy.timeline.playbackSpeed')) {
          provider.sendPlaybackSpeed();
        }
      }
    })
  );

  // Track file visits and update focused file when active editor changes
  // (for access-count mode and depth graph view)
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(async (editor) => {
      if (editor && editor.document.uri.scheme === 'file') {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
          const relativePath = path.relative(
            workspaceFolder.uri.fsPath,
            editor.document.uri.fsPath
          );
          // Only track files within the workspace (not external files)
          if (!relativePath.startsWith('..')) {
            // Normalize to forward slashes for consistency
            const normalizedPath = relativePath.replace(/\\/g, '/');
            await provider.trackFileVisit(normalizedPath);
            // Update focused file for depth graph view
            provider.setFocusedFile(normalizedPath);
            // Emit event for v2 plugins
            provider.emitEvent('workspace:activeEditorChanged', { filePath: normalizedPath });
          }
        }
      } else {
        // No editor or external file - clear focused file
        provider.setFocusedFile(undefined);
        provider.emitEvent('workspace:activeEditorChanged', { filePath: undefined });
      }
    })
  );

  // Refresh graph when files are saved (for connections and file-size modes)
  // Debounce to avoid excessive refreshes during rapid saves
  let saveTimeout: ReturnType<typeof setTimeout> | undefined;
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document) => {
      if (shouldIgnoreSaveForGraphRefresh(document)) {
        return;
      }
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
      saveTimeout = setTimeout(() => {
        console.log('[CodeGraphy] File saved, refreshing graph');
        void provider.refresh();
        provider.emitEvent('workspace:fileChanged', { filePath: document.uri.fsPath });
      }, 500);
    })
  );

  // Refresh graph when files are created or deleted
  const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*');
  context.subscriptions.push(
    fileWatcher.onDidCreate((uri) => {
      console.log('[CodeGraphy] File created, refreshing graph');
      void provider.refresh();
      provider.emitEvent('workspace:fileCreated', { filePath: uri.fsPath });
    })
  );
  context.subscriptions.push(
    fileWatcher.onDidDelete((uri) => {
      console.log('[CodeGraphy] File deleted, refreshing graph');
      void provider.refresh();
      provider.emitEvent('workspace:fileDeleted', { filePath: uri.fsPath });
    })
  );
  context.subscriptions.push(fileWatcher);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('codegraphy.open', () => {
      vscode.commands.executeCommand('workbench.view.extension.codegraphy');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codegraphy.openInEditor', () => {
      provider.openInEditor();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codegraphy.fitView', () => {
      provider.sendCommand('FIT_VIEW');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codegraphy.zoomIn', () => {
      provider.sendCommand('ZOOM_IN');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codegraphy.zoomOut', () => {
      provider.sendCommand('ZOOM_OUT');
    })
  );

  // Undo/Redo commands
  context.subscriptions.push(
    vscode.commands.registerCommand('codegraphy.undo', async () => {
      const description = await provider.undo();
      if (description) {
        vscode.window.showInformationMessage(`Undo: ${description}`);
      } else {
        vscode.window.showInformationMessage('Nothing to undo');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codegraphy.redo', async () => {
      const description = await provider.redo();
      if (description) {
        vscode.window.showInformationMessage(`Redo: ${description}`);
      } else {
        vscode.window.showInformationMessage('Nothing to redo');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codegraphy.exportPng', () => {
      provider.requestExportPng();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codegraphy.exportSvg', () => {
      provider.requestExportSvg();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codegraphy.exportJpeg', () => {
      provider.requestExportJpeg();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codegraphy.exportJson', () => {
      provider.requestExportJson();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codegraphy.exportMarkdown', () => {
      provider.requestExportMarkdown();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codegraphy.clearCache', () => {
      void provider.clearCacheAndRefresh();
    })
  );

  // Toolbar keyboard shortcuts
  context.subscriptions.push(
    vscode.commands.registerCommand('codegraphy.cycleView', () => {
      provider.sendCommand('CYCLE_VIEW');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codegraphy.cycleLayout', () => {
      provider.sendCommand('CYCLE_LAYOUT');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codegraphy.toggleDimension', () => {
      provider.sendCommand('TOGGLE_DIMENSION');
    })
  );

  return {
    getGraphData: () => provider.getGraphData(),
    sendToWebview: (message) => provider.sendToWebview(message),
    onWebviewMessage: (handler) => provider.onWebviewMessage(handler),
    registerPlugin: (plugin: unknown, options?: { extensionUri?: vscode.Uri | string }) =>
      provider.registerExternalPlugin(plugin, options),
  };
}

export function deactivate(): void {
  // Cleanup if needed
}
