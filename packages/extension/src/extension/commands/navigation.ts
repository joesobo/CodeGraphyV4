/**
 * @fileoverview Navigation and view command definitions.
 * @module extension/commands/navigation
 */

import * as vscode from 'vscode';
import type { GraphViewProvider } from '../graphViewProvider';
import { recordExtensionPerformanceEvent } from '../performance/marks';
import type { CommandDefinition } from './definitions';

export function getNavCommands(provider: GraphViewProvider): CommandDefinition[] {
  return [
    {
      id: 'codegraphy.open',
      handler: () => {
        recordExtensionPerformanceEvent('command.open.start');
        const openView = vscode.commands.executeCommand('workbench.view.extension.codegraphy');
        recordExtensionPerformanceEvent('command.open.dispatched');
        void Promise.resolve(openView).then(
          () => recordExtensionPerformanceEvent('command.open.completed'),
          (error: unknown) => recordExtensionPerformanceEvent('command.open.failed', {
            message: error instanceof Error ? error.message : String(error),
          }),
        );
      },
    },
    { id: 'codegraphy.openInEditor', handler: () => { provider.openInEditor(); } },
    { id: 'codegraphy.fitView', handler: () => { provider.sendCommand('FIT_VIEW'); } },
    { id: 'codegraphy.zoomIn', handler: () => { provider.sendCommand('ZOOM_IN'); } },
    { id: 'codegraphy.zoomOut', handler: () => { provider.sendCommand('ZOOM_OUT'); } },
    { id: 'codegraphy.toggleDepthMode', handler: () => { provider.sendCommand('TOGGLE_DEPTH_MODE'); } },
    { id: 'codegraphy.cycleLayout', handler: () => { provider.sendCommand('CYCLE_LAYOUT'); } },
    { id: 'codegraphy.toggleDimension', handler: () => { provider.sendCommand('TOGGLE_DIMENSION'); } },
  ];
}
