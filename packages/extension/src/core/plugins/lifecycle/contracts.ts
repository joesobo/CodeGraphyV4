/**
 * @fileoverview Types for plugin lifecycle operations.
 * @module core/plugins/lifecycle/contracts
 */

import type { IPlugin } from '../types/contracts';

/** Minimal plugin info subset needed for lifecycle operations. */
export interface ILifecyclePluginInfo {
  plugin: IPlugin;
}
