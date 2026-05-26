export type CliCommandName = 'help' | 'index' | 'plugins' | 'setup' | 'status';
export type PluginsCommandAction = 'disable' | 'enable' | 'help' | 'list' | 'register';

export interface CliCommand {
  name: CliCommandName;
  action?: PluginsCommandAction;
  packageName?: string;
  workspacePath?: string;
}

function parsePluginsCommand(argv: string[]): CliCommand {
  const [action, packageName, workspacePath] = argv;

  switch (action) {
    case 'register':
      return { name: 'plugins', action, packageName };
    case 'disable':
    case 'enable':
      return { name: 'plugins', action, packageName, workspacePath };
    case 'list':
      return { name: 'plugins', action, workspacePath: packageName };
    default:
      return { name: 'plugins', action: 'help' };
  }
}

function isHelpCommandName(name: string | undefined): boolean {
  return name === undefined || name === 'help' || name === '--help' || name === '-h';
}

function parseWorkspaceCommand(name: 'index' | 'status', argv: string[]): CliCommand {
  const [workspacePath] = argv;
  return workspacePath ? { name, workspacePath } : { name };
}

export function parseCliCommand(argv: string[]): CliCommand {
  const [name, ...rest] = argv;

  if (isHelpCommandName(name)) {
    return { name: 'help' };
  }

  switch (name) {
    case 'setup':
      return { name: 'setup' };
    case 'index':
    case 'status':
      return parseWorkspaceCommand(name, rest);
    case 'plugins':
      return parsePluginsCommand(rest);
    default:
      return { name: 'help' };
  }
}
