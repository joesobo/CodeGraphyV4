import * as vscode from 'vscode';
import type { GraphViewProvider } from './graphViewProvider';

export interface CommandDefinition {
  id: string;
  handler: () => void | Promise<void>;
}

/** Returns all CodeGraphy command definitions. */
export function getCommandDefinitions(provider: GraphViewProvider): CommandDefinition[] {
  return [
    {
      id: 'codegraphy.open',
      handler: () => {
        vscode.commands.executeCommand('workbench.view.extension.codegraphy');
      },
    },
    {
      id: 'codegraphy.openInEditor',
      handler: () => {
        provider.openInEditor();
      },
    },
    {
      id: 'codegraphy.fitView',
      handler: () => {
        provider.sendCommand('FIT_VIEW');
      },
    },
    {
      id: 'codegraphy.zoomIn',
      handler: () => {
        provider.sendCommand('ZOOM_IN');
      },
    },
    {
      id: 'codegraphy.zoomOut',
      handler: () => {
        provider.sendCommand('ZOOM_OUT');
      },
    },
    {
      id: 'codegraphy.undo',
      handler: async () => {
        const description = await provider.undo();
        if (description) {
          vscode.window.showInformationMessage(`Undo: ${description}`);
        } else {
          vscode.window.showInformationMessage('Nothing to undo');
        }
      },
    },
    {
      id: 'codegraphy.redo',
      handler: async () => {
        const description = await provider.redo();
        if (description) {
          vscode.window.showInformationMessage(`Redo: ${description}`);
        } else {
          vscode.window.showInformationMessage('Nothing to redo');
        }
      },
    },
    {
      id: 'codegraphy.exportPng',
      handler: () => {
        provider.requestExportPng();
      },
    },
    {
      id: 'codegraphy.exportSvg',
      handler: () => {
        provider.requestExportSvg();
      },
    },
    {
      id: 'codegraphy.exportJpeg',
      handler: () => {
        provider.requestExportJpeg();
      },
    },
    {
      id: 'codegraphy.exportJson',
      handler: () => {
        provider.requestExportJson();
      },
    },
    {
      id: 'codegraphy.exportMarkdown',
      handler: () => {
        provider.requestExportMarkdown();
      },
    },
    {
      id: 'codegraphy.clearCache',
      handler: () => {
        void provider.clearCacheAndRefresh();
      },
    },
    {
      id: 'codegraphy.cycleView',
      handler: () => {
        provider.sendCommand('CYCLE_VIEW');
      },
    },
    {
      id: 'codegraphy.cycleLayout',
      handler: () => {
        provider.sendCommand('CYCLE_LAYOUT');
      },
    },
    {
      id: 'codegraphy.toggleDimension',
      handler: () => {
        provider.sendCommand('TOGGLE_DIMENSION');
      },
    },
  ];
}
