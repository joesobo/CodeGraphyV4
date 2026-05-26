import { isHelpCommandName } from './parseHelp';
import { parsePluginsCommand } from './parsePlugins';
import { parseWorkspaceCommand } from './parseWorkspace';
import type { CliCommand } from './parseTypes';

export type {
  CliCommand,
  CliCommandName,
  PluginsCommandAction,
} from './parseTypes';

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
