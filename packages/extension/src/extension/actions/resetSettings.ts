/**
 * @fileoverview Undoable action for resetting all UI settings to defaults.
 * @module extension/actions/resetSettings
 */

import * as vscode from 'vscode';
import type { IUndoableAction } from '../undoManager';
import type { IPhysicsSettings } from '../../shared/settings/physics';
import type { ISettingsSnapshot } from '../../shared/settings/snapshot';
import { getCodeGraphyConfiguration } from '../repoSettings/current';

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

/** Repo settings key for node size mode */
const NODE_SIZE_MODE_KEY = 'nodeSizeMode';

/**
 * Action for resetting all settings to defaults.
 * Uses state-based undo — captures full settings snapshot before reset.
 *
 * On execute: resets all VS Code config keys to `undefined` (reverts to
 * package.json defaults) and resets nodeSizeMode to 'connections'.
 *
 * On undo: restores every captured config value and the original nodeSizeMode.
 */
export class ResetSettingsAction implements IUndoableAction {
  readonly description = 'Reset all settings';

  constructor(
    private readonly _stateBefore: ISettingsSnapshot,
    private readonly _configTarget: vscode.ConfigurationTarget,
    private readonly _context: vscode.ExtensionContext,
    private readonly _sendAllSettings: () => void,
    private readonly _setNodeSizeMode: (mode: ISettingsSnapshot['nodeSizeMode']) => void,
    private readonly _refreshGraph: () => Promise<void>,
  ) {}

  async execute(): Promise<void> {
    const config = getCodeGraphyConfiguration();
    const target = this._configTarget;
    void this._context;

    for (const key of PHYSICS_KEYS) {
      await config.update(`physics.${key}`, undefined, target);
    }
    for (const configKey of Object.keys(CONFIG_TO_SNAPSHOT)) {
      await config.update(configKey, undefined, target);
    }

    this._setNodeSizeMode('connections');
    await config.update(NODE_SIZE_MODE_KEY, 'connections', target);

    this._sendAllSettings();
    await this._refreshGraph();
  }

  async undo(): Promise<void> {
    const config = getCodeGraphyConfiguration();
    const target = this._configTarget;
    const before = this._stateBefore;
    void this._context;

    for (const key of PHYSICS_KEYS) {
      await config.update(`physics.${key}`, before.physics[key], target);
    }
    for (const [configKey, snapshotField] of Object.entries(CONFIG_TO_SNAPSHOT)) {
      await config.update(configKey, before[snapshotField], target);
    }

    this._setNodeSizeMode(before.nodeSizeMode);
    await config.update(NODE_SIZE_MODE_KEY, before.nodeSizeMode, target);

    this._sendAllSettings();
    await this._refreshGraph();
  }
}
