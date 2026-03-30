/**
 * @fileoverview Public facade for the graph view provider.
 */

import * as vscode from 'vscode';
import { GraphViewProviderRuntime } from './graphView/provider/runtime';
import type { GraphViewProviderPublicMethods } from './graphView/provider/publicApi';

/**
 * Exposes the host runtime through the public API used by commands, tests,
 * and VS Code registration.
 */
export class GraphViewProvider
  extends GraphViewProviderRuntime
  implements vscode.WebviewViewProvider
{
  public static readonly viewType = 'codegraphy.graphView';

  declare public readonly refresh: GraphViewProviderPublicMethods['refresh'];
  declare public readonly refreshPhysicsSettings:
    GraphViewProviderPublicMethods['refreshPhysicsSettings'];
  declare public readonly refreshSettings: GraphViewProviderPublicMethods['refreshSettings'];
  declare public readonly refreshToggleSettings:
    GraphViewProviderPublicMethods['refreshToggleSettings'];
  declare public readonly clearCacheAndRefresh:
    GraphViewProviderPublicMethods['clearCacheAndRefresh'];
  declare public readonly sendCommand: GraphViewProviderPublicMethods['sendCommand'];
  declare public readonly undo: GraphViewProviderPublicMethods['undo'];
  declare public readonly redo: GraphViewProviderPublicMethods['redo'];
  declare public readonly canUndo: GraphViewProviderPublicMethods['canUndo'];
  declare public readonly canRedo: GraphViewProviderPublicMethods['canRedo'];
  declare public readonly requestExportPng: GraphViewProviderPublicMethods['requestExportPng'];
  declare public readonly requestExportSvg: GraphViewProviderPublicMethods['requestExportSvg'];
  declare public readonly requestExportJpeg: GraphViewProviderPublicMethods['requestExportJpeg'];
  declare public readonly requestExportJson: GraphViewProviderPublicMethods['requestExportJson'];
  declare public readonly requestExportMarkdown:
    GraphViewProviderPublicMethods['requestExportMarkdown'];
  declare public readonly emitEvent: GraphViewProviderPublicMethods['emitEvent'];
  declare public readonly resolveWebviewView:
    GraphViewProviderPublicMethods['resolveWebviewView'];
  declare public readonly updateGraphData: GraphViewProviderPublicMethods['updateGraphData'];
  declare public readonly getGraphData: GraphViewProviderPublicMethods['getGraphData'];
  declare public readonly sendPlaybackSpeed:
    GraphViewProviderPublicMethods['sendPlaybackSpeed'];
  declare public readonly invalidateTimelineCache:
    GraphViewProviderPublicMethods['invalidateTimelineCache'];
  declare public readonly trackFileVisit: GraphViewProviderPublicMethods['trackFileVisit'];
  declare public readonly registerExternalPlugin:
    GraphViewProviderPublicMethods['registerExternalPlugin'];
  declare public readonly changeView: GraphViewProviderPublicMethods['changeView'];
  declare public readonly setFocusedFile: GraphViewProviderPublicMethods['setFocusedFile'];
  declare public readonly setDepthLimit: GraphViewProviderPublicMethods['setDepthLimit'];
  declare public readonly getDepthLimit: GraphViewProviderPublicMethods['getDepthLimit'];
  declare public readonly openInEditor: GraphViewProviderPublicMethods['openInEditor'];
  declare public readonly sendToWebview: GraphViewProviderPublicMethods['sendToWebview'];
  declare public readonly onWebviewMessage: GraphViewProviderPublicMethods['onWebviewMessage'];
}
