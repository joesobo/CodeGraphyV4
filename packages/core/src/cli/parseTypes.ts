import type {
  GraphQueryReport,
  WorkspaceGraphQueryProjection,
} from '../workspace/requestTypes';

export type CliCommandName =
  | 'batch'
  | 'doctor'
  | 'filter'
  | 'help'
  | 'index'
  | 'plugins'
  | 'query'
  | 'scope'
  | 'status'
  | 'version';
export type PluginsCommandAction = 'disable' | 'enable' | 'help' | 'inherit' | 'link' | 'list' | 'register';

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
  verbose?: boolean;
  workspacePath?: string;
}
