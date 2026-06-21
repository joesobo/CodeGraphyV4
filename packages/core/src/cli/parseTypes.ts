export type CliCommandName = 'help' | 'index' | 'plugins' | 'setup' | 'status';
export type PluginsCommandAction = 'disable' | 'enable' | 'help' | 'link' | 'list' | 'register';

export interface CliCommand {
  name: CliCommandName;
  action?: PluginsCommandAction;
  packageName?: string;
  packageRoot?: string;
  verbose?: boolean;
  workspacePath?: string;
}
