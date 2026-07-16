import type { GraphQueryReport } from '../workspace/requestTypes';

export type CliCommandName = 'help' | 'index' | 'plugins' | 'query' | 'setup' | 'status';
export type PluginsCommandAction = 'disable' | 'enable' | 'help' | 'link' | 'list' | 'register';

export interface CliCommand {
  name: CliCommandName;
  action?: PluginsCommandAction;
  arguments?: Record<string, unknown>;
  packageName?: string;
  packageRoot?: string;
  parseError?: string;
  report?: GraphQueryReport;
  verbose?: boolean;
  workspacePath?: string;
}
