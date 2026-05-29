import type { CliCommand } from './parseTypes';

export function parsePluginsCommand(argv: string[]): CliCommand {
  const [action, packageName, workspacePath] = argv;

  switch (action) {
    case 'register':
      return { name: 'plugins', action, packageName };
    case 'link':
      return { name: 'plugins', action, packageRoot: packageName };
    case 'disable':
    case 'enable':
      return { name: 'plugins', action, packageName, workspacePath };
    case 'list':
      return { name: 'plugins', action, workspacePath: packageName };
    default:
      return { name: 'plugins', action: 'help' };
  }
}
