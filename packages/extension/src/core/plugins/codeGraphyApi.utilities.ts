import type { CodeGraphyApiContext } from './codeGraphyApi';
import type { ICommand, IContextMenuItem } from '../../../../plugin-api/src/commands';
import type { IExporter, IToolbarAction } from '../../../../plugin-api/src/api';

type UtilityContext = Pick<
  CodeGraphyApiContext,
  | 'pluginId'
  | 'workspaceRoot'
  | 'logFn'
  | 'commands'
  | 'contextMenuItems'
  | 'exporters'
  | 'toolbarActions'
>;

export function getPluginId(context: UtilityContext): string {
  return context.pluginId;
}

export function getCommands(context: UtilityContext): readonly ICommand[] {
  return context.commands;
}

export function getContextMenuItems(context: UtilityContext): readonly IContextMenuItem[] {
  return context.contextMenuItems;
}

export function getExporters(context: UtilityContext): readonly IExporter[] {
  return context.exporters;
}

export function getToolbarActions(context: UtilityContext): readonly IToolbarAction[] {
  return context.toolbarActions;
}

export function getWorkspaceRoot(context: UtilityContext): string {
  return context.workspaceRoot;
}

export function logPluginMessage(
  context: UtilityContext,
  level: 'info' | 'warn' | 'error',
  ...args: unknown[]
): void {
  context.logFn(level, `[${context.pluginId}]`, ...args);
}
