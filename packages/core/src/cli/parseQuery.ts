import type { GraphQueryReport } from '../workspace/requestTypes';
import type { CliCommand } from './parseTypes';

const QUERY_COMMANDS = new Set([
  'dependencies',
  'dependents',
  'edges',
  'nodes',
  'path',
  'search',
]);

const DEFAULT_LIMIT = 100;
const DEFAULT_MAX_DEPTH = 6;
const DEFAULT_MAX_PATHS = 5;

export function isGraphQueryReport(value: string | undefined): boolean {
  return value !== undefined && QUERY_COMMANDS.has(value);
}

function parseError(message: string): CliCommand {
  return { name: 'query', parseError: message };
}

function rejectOption(command: string, args: string[]): CliCommand | undefined {
  const option = args.find(argument => argument.startsWith('-'));
  return option ? parseError(`Unknown option for ${command}: ${option}`) : undefined;
}

function requireOperands(command: string, args: string[], count: number, usage: string): CliCommand | undefined {
  if (args.length < count) return parseError(`${command} requires ${usage}`);
  if (args.length > count) return parseError(`Unexpected argument for ${command}: ${args[count]}`);
  return undefined;
}

function query(report: GraphQueryReport, arguments_: Record<string, unknown>): CliCommand {
  return { name: 'query', report, arguments: arguments_ };
}

export function parseQueryCommand(argv: string[]): CliCommand {
  const [command, ...args] = argv;
  if (!isGraphQueryReport(command)) {
    return parseError(`Unknown query command: ${command ?? ''}`);
  }

  const invalidOption = rejectOption(command, args);
  if (invalidOption) return invalidOption;

  switch (command) {
    case 'nodes':
    case 'edges': {
      const invalid = requireOperands(command, args, 0, '');
      return invalid ?? query(command, { limit: DEFAULT_LIMIT });
    }
    case 'search': {
      const invalid = requireOperands(command, args, 1, '<text>');
      return invalid ?? query('nodes', { search: args[0], limit: DEFAULT_LIMIT });
    }
    case 'dependencies': {
      const invalid = requireOperands(command, args, 1, '<node>');
      return invalid ?? query('edges', {
        from: args[0], expandFileSelectors: true, projectFileEndpoints: true, limit: DEFAULT_LIMIT,
      });
    }
    case 'dependents': {
      const invalid = requireOperands(command, args, 1, '<node>');
      return invalid ?? query('edges', {
        to: args[0], expandFileSelectors: true, projectFileEndpoints: true, limit: DEFAULT_LIMIT,
      });
    }
    case 'path': {
      const invalid = requireOperands(command, args, 2, '<from> <to>');
      return invalid ?? query('paths', {
        from: args[0],
        to: args[1],
        maxDepth: DEFAULT_MAX_DEPTH,
        maxPaths: DEFAULT_MAX_PATHS,
        expandFileSelectors: true,
        projectFileEndpoints: true,
      });
    }
    default:
      return parseError(`Unknown query command: ${command}`);
  }
}
