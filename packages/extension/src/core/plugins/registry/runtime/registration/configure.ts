/**
 * @fileoverview V2 configuration builder for the plugin registry.
 * @module core/plugins/registry/configure
 */

import type { EventBus } from '../../../events/bus';
import type { DecorationManager } from '../../../decoration/manager';
import type { GraphDataProvider, CommandRegistrar, WebviewMessageSender, ExportSaver } from '../../../api/instance/runtime/state/context';
import type { ViewRegistry } from '../../../../views/registry';
import type { RegistryV2Config } from './register';

export interface ConfigureV2Options {
  eventBus: EventBus;
  decorationManager: DecorationManager;
  viewRegistry: ViewRegistry;
  graphProvider: GraphDataProvider;
  commandRegistrar: CommandRegistrar;
  webviewSender: WebviewMessageSender;
  exportSaver?: ExportSaver;
  workspaceRoot: string;
  logFn?: (level: string, ...args: unknown[]) => void;
}

export const DEFAULT_LOG_FN = (level: string, ...args: unknown[]): void => {
  if (level === 'error') console.error(...args);
  else if (level === 'warn') console.warn(...args);
  else console.log(...args);
};

/**
 * Build a RegistryV2Config from options.
 */
export function buildV2Config(options: ConfigureV2Options, currentLogFn: (level: string, ...args: unknown[]) => void): RegistryV2Config {
  return {
    eventBus: options.eventBus,
    decorationManager: options.decorationManager,
    viewRegistry: options.viewRegistry,
    graphProvider: options.graphProvider,
    commandRegistrar: options.commandRegistrar,
    webviewSender: options.webviewSender,
    exportSaver: options.exportSaver,
    workspaceRoot: options.workspaceRoot,
    logFn: options.logFn ?? currentLogFn,
  };
}
