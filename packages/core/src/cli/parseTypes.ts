import type {
  GraphQueryReport,
  WorkspaceGraphQueryProjection,
} from '../workspace/requestTypes';

export type CliCommandName =
  | 'doctor'
  | 'filter'
  | 'help'
  | 'index'
  | 'plugins'
  | 'query'
  | 'scope'
  | 'settings'
  | 'status'
  | 'version'
  | 'watch';
export type PluginsCommandAction = 'disable' | 'enable' | 'help' | 'inherit' | 'link' | 'list' | 'register';
export type WorkspaceSettingsCommandAction = 'get' | 'list' | 'set' | 'unset';

interface CliCommandContext {
  action?: PluginsCommandAction;
  arguments?: Record<string, unknown>;
  helpPath?: string[];
  invokedCommand?: string;
  packageName?: string;
  packageRoot?: string;
  parseError?: string;
  pluginScope?: 'global' | 'workspace';
  projection?: WorkspaceGraphQueryProjection;
  report?: GraphQueryReport;
  verbose?: boolean;
  workspacePath?: string;
}

interface GeneralCliCommand extends CliCommandContext {
  name: Exclude<CliCommandName, 'settings'>;
}

export type WorkspaceSettingsCommand =
  | { action: 'list' }
  | { action: 'get' | 'unset'; key: string }
  | { action: 'set'; key: string; value: unknown };

export interface SettingsCliCommand extends CliCommandContext {
  name: 'settings';
  settings: WorkspaceSettingsCommand;
}

export type CliCommand = GeneralCliCommand | SettingsCliCommand;
