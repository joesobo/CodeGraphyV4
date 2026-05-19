export type CliCommandName = 'help' | 'index' | 'mcp' | 'plugins' | 'setup' | 'status';
export type PluginsCommandAction = 'add' | 'disable' | 'enable' | 'help' | 'link' | 'list' | 'refresh';

export interface CliCommand {
  name: CliCommandName;
  action?: PluginsCommandAction;
  packageName?: string;
  packageRoot?: string;
  workspacePath?: string;
}

function parsePluginsCommand(argv: string[]): CliCommand {
  const [action, packageName, workspacePath] = argv;

  switch (action) {
    case 'add':
      return { name: 'plugins', action, packageName };
    case 'link':
      return { name: 'plugins', action, packageRoot: packageName };
    case 'disable':
    case 'enable':
      return { name: 'plugins', action, packageName, workspacePath };
    case 'list':
      return { name: 'plugins', action, workspacePath: packageName };
    case 'refresh':
      return { name: 'plugins', action };
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
    case 'mcp':
      return { name: 'mcp' };
    case 'plugins':
      return parsePluginsCommand(rest);
    default:
      return { name: 'help' };
  }
}
