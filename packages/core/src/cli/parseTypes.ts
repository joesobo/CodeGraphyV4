export type CliCommandName = 'help' | 'index' | 'plugins' | 'setup' | 'status';
export type PluginsCommandAction = 'disable' | 'enable' | 'help' | 'list' | 'register';

export interface CliCommand {
  name: CliCommandName;
  action?: PluginsCommandAction;
  packageName?: string;
  workspacePath?: string;
}
