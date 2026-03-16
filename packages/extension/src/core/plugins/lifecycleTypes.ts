/**
 * @fileoverview Types for plugin lifecycle operations.
 * @module core/plugins/lifecycleTypes
 */

import type { IPlugin } from './types';

/** Minimal plugin info subset needed for lifecycle operations. */
export interface ILifecyclePluginInfo {
  plugin: IPlugin;
}
