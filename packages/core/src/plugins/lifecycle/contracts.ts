/**
 * @fileoverview Types for plugin lifecycle operations.
 * @module core/plugins/lifecycle/contracts
 */

import type { IPlugin } from '@codegraphy/plugin-api';

/** Minimal plugin info subset needed for lifecycle operations. */
export interface ILifecyclePluginInfo {
  plugin: IPlugin;
  options?: Record<string, unknown>;
}
