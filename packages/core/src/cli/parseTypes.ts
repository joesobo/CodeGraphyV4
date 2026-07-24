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
  | 'version';
export type PluginsCommandAction = 'disable' | 'enable' | 'help' | 'inherit' | 'link' | 'list' | 'register';
export type WorkspaceSettingsCommandAction = 'get' | 'set' | 'unset';

export interface CliCommand {
  name: CliCommandName;
  action?: PluginsCommandAction;
  arguments?: Record<string, unknown>;
  helpPath?: string[];
  invokedCommand?: string;
  packageName?: string;
  packageRoot?: string;
  pluginScope?: 'global' | 'workspace';
  parseError?: string;
  projection?: WorkspaceGraphQueryProjection;
  report?: GraphQueryReport;
  settingsAction?: WorkspaceSettingsCommandAction;
  settingsKey?: string;
  settingsValue?: unknown;
  verbose?: boolean;
  workspacePath?: string;
}
