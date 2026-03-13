/**
 * @fileoverview Undoable action for resetting all UI settings to defaults.
 * @module extension/actions/ResetSettingsAction
 */

import * as vscode from 'vscode';
import type { IUndoableAction } from '../UndoManager';
import type { ISettingsSnapshot, NodeSizeMode } from '../../shared/types';

/**
 * Action for resetting all settings to defaults.
 * Uses state-based undo — captures full settings snapshot before reset.
 *
 * On execute: resets all VS Code config keys to `undefined` (reverts to
 * package.json defaults) and tells the webview to reset nodeSizeMode.
 *
 * On undo: restores every captured config value and the original nodeSizeMode.
 */
export class ResetSettingsAction implements IUndoableAction {
  readonly description = 'Reset all settings';

  constructor(
    /** Full settings state captured *before* the reset. */
    private readonly _stateBefore: ISettingsSnapshot,
    /** VS Code config target (workspace vs global). */
    private readonly _configTarget: vscode.ConfigurationTarget,
    /**
     * Callback that sends all current settings to the webview.
     * Receives the nodeSizeMode to apply (webview-only state).
     */
    private readonly _sendAllSettings: (nodeSizeMode: NodeSizeMode) => void,
    /** Callback to re-analyse and re-render the graph after config changes. */
    private readonly _refreshGraph: () => Promise<void>,
  ) {}

  async execute(): Promise<void> {
    const physics = vscode.workspace.getConfiguration('codegraphy.physics');
    const config = vscode.workspace.getConfiguration('codegraphy');
    const target = this._configTarget;

    // Reset physics
    await physics.update('repelForce', undefined, target);
    await physics.update('linkDistance', undefined, target);
    await physics.update('linkForce', undefined, target);
    await physics.update('damping', undefined, target);
    await physics.update('centerForce', undefined, target);

    // Reset display / filter / group settings
    await config.update('groups', undefined, target);
    await config.update('filterPatterns', undefined, target);
    await config.update('showOrphans', undefined, target);
    await config.update('bidirectionalEdges', undefined, target);
    await config.update('directionMode', undefined, target);
    await config.update('directionColor', undefined, target);
    await config.update('folderNodeColor', undefined, target);
    await config.update('particleSpeed', undefined, target);
    await config.update('particleSize', undefined, target);
    await config.update('showLabels', undefined, target);
    await config.update('maxFiles', undefined, target);
    await config.update('hiddenPluginGroups', undefined, target);

    this._sendAllSettings('connections');
    await this._refreshGraph();
  }

  async undo(): Promise<void> {
    const physics = vscode.workspace.getConfiguration('codegraphy.physics');
    const config = vscode.workspace.getConfiguration('codegraphy');
    const target = this._configTarget;
    const before = this._stateBefore;

    // Restore physics
    await physics.update('repelForce', before.physics.repelForce, target);
    await physics.update('linkDistance', before.physics.linkDistance, target);
    await physics.update('linkForce', before.physics.linkForce, target);
    await physics.update('damping', before.physics.damping, target);
    await physics.update('centerForce', before.physics.centerForce, target);

    // Restore display / filter / group settings
    await config.update('groups', before.groups, target);
    await config.update('filterPatterns', before.filterPatterns, target);
    await config.update('showOrphans', before.showOrphans, target);
    await config.update('bidirectionalEdges', before.bidirectionalMode, target);
    await config.update('directionMode', before.directionMode, target);
    await config.update('directionColor', before.directionColor, target);
    await config.update('folderNodeColor', before.folderNodeColor, target);
    await config.update('particleSpeed', before.particleSpeed, target);
    await config.update('particleSize', before.particleSize, target);
    await config.update('showLabels', before.showLabels, target);
    await config.update('maxFiles', before.maxFiles, target);
    await config.update('hiddenPluginGroups', before.hiddenPluginGroups, target);

    this._sendAllSettings(before.nodeSizeMode);
    await this._refreshGraph();
  }
}
