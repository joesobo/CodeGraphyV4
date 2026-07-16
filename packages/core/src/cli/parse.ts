import { isHelpCommandName } from './parseHelp';
import { parsePluginsCommand } from './parsePlugins';
import { parseQueryCommand } from './parseQuery';
import { parseWorkspaceCommand } from './parseWorkspace';
import type { CliCommand } from './parseTypes';

export type {
  CliCommand,
  CliCommandName,
  PluginsCommandAction,
} from './parseTypes';

function readGlobalFlags(argv: string[]): { positional: string[]; verbose: boolean } {
  const positional: string[] = [];
  let verbose = false;

  for (const arg of argv) {
    if (arg === '--verbose') {
      verbose = true;
      continue;
    }

    positional.push(arg);
  }

  return { positional, verbose };
}

function withGlobalFlags(command: CliCommand, verbose: boolean): CliCommand {
  return verbose ? { ...command, verbose } : command;
}

export function parseCliCommand(argv: string[]): CliCommand {
  const { positional, verbose } = readGlobalFlags(argv);
  const [name, ...rest] = positional;

  if (isHelpCommandName(name)) {
    return withGlobalFlags({ name: 'help' }, verbose);
  }

  let command: CliCommand;
  switch (name) {
    case 'setup':
      command = { name: 'setup' };
      break;
    case 'index':
    case 'status':
      command = parseWorkspaceCommand(name, rest);
      break;
    case 'plugins':
      command = parsePluginsCommand(rest);
      break;
    case 'query':
      command = parseQueryCommand(rest);
      break;
    default:
      command = { name: 'help' };
  }

  return withGlobalFlags(command, verbose);
}
