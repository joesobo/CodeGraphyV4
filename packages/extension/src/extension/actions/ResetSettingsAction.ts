/**
 * @fileoverview Undoable action for resetting all UI settings to defaults.
 * @module extension/actions/ResetSettingsAction
 */

import * as vscode from 'vscode';
import type { IUndoableAction } from '../UndoManager';
import type { ISettingsSnapshot, IPhysicsSettings, NodeSizeMode } from '../../shared/types';

/** Physics keys live under `codegraphy.physics.*` */
const PHYSICS_KEYS: (keyof IPhysicsSettings)[] = [
  'repelForce', 'linkDistance', 'linkForce', 'damping', 'centerForce',
];

/**
 * Mapping from VS Code config key (`codegraphy.<key>`) to the
 * corresponding field on {@link ISettingsSnapshot}.
 *
 * `bidirectionalEdges` → `bidirectionalMode` is the only name mismatch.
 */
const CONFIG_TO_SNAPSHOT: Record<string, keyof ISettingsSnapshot> = {
  groups: 'groups',
  filterPatterns: 'filterPatterns',
  showOrphans: 'showOrphans',
  bidirectionalEdges: 'bidirectionalMode',
  directionMode: 'directionMode',
  directionColor: 'directionColor',
  folderNodeColor: 'folderNodeColor',
  particleSpeed: 'particleSpeed',
  particleSize: 'particleSize',
  showLabels: 'showLabels',
  maxFiles: 'maxFiles',
  hiddenPluginGroups: 'hiddenPluginGroups',
};

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
    private readonly _stateBefore: ISettingsSnapshot,
    private readonly _configTarget: vscode.ConfigurationTarget,
    private readonly _sendAllSettings: (nodeSizeMode: NodeSizeMode) => void,
    private readonly _refreshGraph: () => Promise<void>,
  ) {}

  async execute(): Promise<void> {
    const physics = vscode.workspace.getConfiguration('codegraphy.physics');
    const config = vscode.workspace.getConfiguration('codegraphy');
    const target = this._configTarget;

    for (const key of PHYSICS_KEYS) {
      await physics.update(key, undefined, target);
    }
    for (const configKey of Object.keys(CONFIG_TO_SNAPSHOT)) {
      await config.update(configKey, undefined, target);
    }

    this._sendAllSettings('connections');
    await this._refreshGraph();
  }

  async undo(): Promise<void> {
    const physics = vscode.workspace.getConfiguration('codegraphy.physics');
    const config = vscode.workspace.getConfiguration('codegraphy');
    const target = this._configTarget;
    const before = this._stateBefore;

    for (const key of PHYSICS_KEYS) {
      await physics.update(key, before.physics[key], target);
    }
    for (const [configKey, snapshotField] of Object.entries(CONFIG_TO_SNAPSHOT)) {
      await config.update(configKey, before[snapshotField], target);
    }

    this._sendAllSettings(before.nodeSizeMode);
    await this._refreshGraph();
  }
}
