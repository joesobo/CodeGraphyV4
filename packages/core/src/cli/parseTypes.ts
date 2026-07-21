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
  | 'status'
  | 'version';
export type PluginsCommandAction = 'disable' | 'enable' | 'help' | 'link' | 'list' | 'register';

export interface CliCommand {
  name: CliCommandName;
  action?: PluginsCommandAction;
  arguments?: Record<string, unknown>;
  helpPath?: string[];
  invokedCommand?: string;
  packageName?: string;
  packageRoot?: string;
  parseError?: string;
  projection?: WorkspaceGraphQueryProjection;
  report?: GraphQueryReport;
  verbose?: boolean;
  workspacePath?: string;
}
