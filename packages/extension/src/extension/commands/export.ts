/**
 * @fileoverview Export and edit command definitions.
 * @module extension/commands/export
 */

import * as vscode from 'vscode';
import type { GraphViewProvider } from '../graphViewProvider';
import type { CommandDefinition } from './definitions';

export function getExportCommands(provider: GraphViewProvider): CommandDefinition[] {
  return [
    {
      id: 'codegraphy.undo',
      handler: async () => {
        const description = await provider.undo();
        if (description) { vscode.window.showInformationMessage(`Undo: ${description}`); }
        else { vscode.window.showInformationMessage('Nothing to undo'); }
      },
    },
    {
      id: 'codegraphy.redo',
      handler: async () => {
        const description = await provider.redo();
        if (description) { vscode.window.showInformationMessage(`Redo: ${description}`); }
        else { vscode.window.showInformationMessage('Nothing to redo'); }
      },
    },
    { id: 'codegraphy.exportPng', handler: () => { provider.requestExportPng(); } },
    { id: 'codegraphy.exportSvg', handler: () => { provider.requestExportSvg(); } },
    { id: 'codegraphy.exportJpeg', handler: () => { provider.requestExportJpeg(); } },
    { id: 'codegraphy.exportJson', handler: () => { provider.requestExportJson(); } },
    { id: 'codegraphy.exportMarkdown', handler: () => { provider.requestExportMarkdown(); } },
    { id: 'codegraphy.clearCache', handler: () => { void provider.clearCacheAndRefresh(); } },
  ];
}
