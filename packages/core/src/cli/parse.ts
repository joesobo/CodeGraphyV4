import { parseFilterCommand, parseScopeCommand } from './parseGraphControls';
import { isHelpCommandName } from './parseHelp';
import { isPluginCommand, parsePluginsCommand } from './parsePlugins';
import { isGraphQueryReport, parseQueryCommand } from './parseQuery';
import { parseWorkspaceCommand } from './parseWorkspace';
import type { CliCommand } from './parseTypes';

export type { CliCommand, CliCommandName, PluginsCommandAction } from './parseTypes';

interface GlobalFlags {
  argv: string[];
  parseError?: string;
  verbose: boolean;
  workspacePath?: string;
}

function readGlobalFlags(argv: string[]): GlobalFlags {
  const positional: string[] = [];
  let verbose = false;
  let workspacePath: string | undefined;
  let optionsEnded = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--') {
      optionsEnded = true;
      if (positional.length > 0) positional.push(argument);
      continue;
    }
    if (!optionsEnded && argument === '--verbose') {
      verbose = true;
      continue;
    }
    if (!optionsEnded && (argument === '-C' || argument === '--workspace')) {
      if (workspacePath !== undefined) {
        return { argv: positional, verbose, workspacePath, parseError: `Duplicate workspace option: ${argument}` };
      }
      const value = argv[index + 1];
      if (!value || value.startsWith('-')) {
        return { argv: positional, verbose, parseError: `Missing value for ${argument}` };
      }
      workspacePath = value;
      index += 1;
      continue;
    }
    positional.push(argument);
  }

  return { argv: positional, verbose, workspacePath };
}

function withGlobalFlags(command: CliCommand, flags: GlobalFlags): CliCommand {
  return {
    ...command,
    ...(flags.verbose ? { verbose: true } : {}),
    ...(flags.workspacePath ? { workspacePath: flags.workspacePath } : {}),
  };
}

function nestedHelpPath(name: string, rest: string[]): string[] | undefined {
  if (!rest.some(argument => argument === '--help' || argument === '-h')) return undefined;
  if (name === 'plugins' && isPluginCommand(rest[0])) return ['plugins', rest[0]];
  if (name === 'plugins' && rest[0] && rest[0] !== '--help' && rest[0] !== '-h') return undefined;
  return [name];
}

function isKnownCommandName(name: string): boolean {
  return name === 'doctor'
    || name === 'filter'
    || name === 'index'
    || name === 'plugins'
    || name === 'scope'
    || name === 'status'
    || isGraphQueryReport(name);
}

function parseArgumentFreeCommand(name: 'version', args: string[]): CliCommand {
  const [extra] = args;
  return extra ? { name, parseError: `Unexpected argument for ${name}: ${extra}` } : { name };
}

function parseHelp(rest: string[]): CliCommand {
  const [topic, action, extra] = rest;
  if (!topic) return { name: 'help' };
  if (!isKnownCommandName(topic)) return { name: 'help', parseError: `Unknown help topic: ${topic}` };
  if (topic === 'plugins' && action && !isPluginCommand(action)) {
    return { name: 'help', parseError: `Unknown plugin help topic: ${action}` };
  }
  if (extra || (action && topic !== 'plugins')) {
    return { name: 'help', parseError: `Unexpected help argument: ${extra ?? action}` };
  }
  return { name: 'help', helpPath: action ? [topic, action] : [topic] };
}

export function parseCliCommand(argv: string[]): CliCommand {
  const flags = readGlobalFlags(argv);
  if (flags.parseError) return withGlobalFlags({ name: 'help', parseError: flags.parseError }, flags);
  const [name, ...rest] = flags.argv;

  if (name === 'help') return withGlobalFlags(parseHelp(rest), flags);
  if (isHelpCommandName(name)) return withGlobalFlags({ name: 'help' }, flags);
  if (name === '--version' || name === '-V') {
    return withGlobalFlags(parseArgumentFreeCommand('version', rest), flags);
  }

  const helpPath = name ? nestedHelpPath(name, rest) : undefined;
  if (helpPath && name && isKnownCommandName(name)) {
    return withGlobalFlags({ name: 'help', helpPath }, flags);
  }

  let command: CliCommand;
  switch (name) {
    case 'doctor':
    case 'index':
    case 'status':
      command = parseWorkspaceCommand(name, rest);
      break;
    case 'scope':
      command = parseScopeCommand(rest);
      break;
    case 'filter':
      command = parseFilterCommand(rest);
      break;
    case 'plugins':
      command = parsePluginsCommand(rest);
      break;
    default:
      command = isGraphQueryReport(name)
        ? parseQueryCommand([name, ...rest])
        : { name: 'help', invokedCommand: name, parseError: `Unknown command: ${name}` };
  }

  return withGlobalFlags(command, flags);
}
