import { isHelpCommandName } from './parseHelp';
import { isPluginCommand, parsePluginsCommand } from './parsePlugins';
import { isGraphQueryReport, parseQueryCommand } from './parseQuery';
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

function nestedHelpPath(name: string, rest: string[]): string[] | undefined {
  if (!rest.some(argument => argument === '--help' || argument === '-h')) {
    return undefined;
  }
  if (name === 'plugins' && isPluginCommand(rest[0])) {
    return ['plugins', rest[0]];
  }
  if (name === 'plugins' && rest[0] && rest[0] !== '--help' && rest[0] !== '-h') {
    return undefined;
  }
  return [name];
}

function isKnownCommandName(name: string): boolean {
  return name === 'setup'
    || name === 'status'
    || name === 'index'
    || name === 'plugins'
    || isGraphQueryReport(name);
}

function parseArgumentFreeCommand(name: 'setup' | 'version', args: string[]): CliCommand {
  const [extra] = args;
  return extra
    ? { name, parseError: `Unexpected argument for ${name}: ${extra}` }
    : { name };
}

export function parseCliCommand(argv: string[]): CliCommand {
  const { positional, verbose } = readGlobalFlags(argv);
  const [name, ...rest] = positional;

  if (name === 'help') {
    const [topic, action, extra] = rest;
    if (!topic) {
      return withGlobalFlags({ name: 'help' }, verbose);
    }
    if (!isKnownCommandName(topic)) {
      return withGlobalFlags({ name: 'help', parseError: `Unknown help topic: ${topic}` }, verbose);
    }
    if (topic === 'plugins' && action && !isPluginCommand(action)) {
      return withGlobalFlags({
        name: 'help',
        parseError: `Unknown plugin help topic: ${action}`,
      }, verbose);
    }
    if (extra || (action && topic !== 'plugins')) {
      return withGlobalFlags({
        name: 'help',
        parseError: `Unexpected help argument: ${extra ?? action}`,
      }, verbose);
    }
    return withGlobalFlags({ name: 'help', helpPath: action ? [topic, action] : [topic] }, verbose);
  }
  if (isHelpCommandName(name)) {
    return withGlobalFlags({ name: 'help' }, verbose);
  }
  if (name === '--version' || name === '-V') {
    return withGlobalFlags(parseArgumentFreeCommand('version', rest), verbose);
  }
  const helpPath = name ? nestedHelpPath(name, rest) : undefined;
  if (helpPath && name && isKnownCommandName(name)) {
    return withGlobalFlags({ name: 'help', helpPath }, verbose);
  }

  let command: CliCommand;
  switch (name) {
    case 'setup':
      command = parseArgumentFreeCommand('setup', rest);
      break;
    case 'index':
    case 'status':
      command = parseWorkspaceCommand(name, rest);
      break;
    case 'plugins':
      command = parsePluginsCommand(rest);
      break;
    default:
      command = isGraphQueryReport(name)
        ? parseQueryCommand([name, ...rest])
        : { name: 'help', parseError: `Unknown command: ${name}` };
  }

  return withGlobalFlags(command, verbose);
}
