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

export function parseCliCommand(argv: string[]): CliCommand {
  const [name, ...rest] = argv;

  switch (name) {
    case undefined:
    case 'help':
    case '--help':
    case '-h':
      return { name: 'help' };
    case 'setup':
      return { name: 'setup' };
    case 'index':
      return rest[0] ? { name: 'index', workspacePath: rest[0] } : { name: 'index' };
    case 'status':
      return rest[0] ? { name: 'status', workspacePath: rest[0] } : { name: 'status' };
    case 'plugins':
      return parsePluginsCommand(rest);
    default:
      return { name: 'help' };
  }
}
