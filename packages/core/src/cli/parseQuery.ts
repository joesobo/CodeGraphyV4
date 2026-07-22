import type { GraphQueryReport, WorkspaceGraphQueryProjection } from '../workspace/requestTypes';
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

interface ParsedQueryArguments {
  operands: string[];
  limit: number;
  offset?: number;
  parseError?: string;
  projection?: WorkspaceGraphQueryProjection;
}

export function isGraphQueryReport(value: string | undefined): boolean {
  return value !== undefined && QUERY_COMMANDS.has(value);
}

function parseError(command: string, message: string): CliCommand {
  return { name: 'query', invokedCommand: command, parseError: message };
}

function parseInteger(value: string | undefined, minimum: number): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum ? parsed : undefined;
}

function parseArguments(
  command: string,
  argv: string[],
  allowPagination: boolean,
): ParsedQueryArguments {
  const operands: string[] = [];
  let limit = DEFAULT_LIMIT;
  let offset: number | undefined;
  let optionsEnded = false;
  const projection: NonNullable<ParsedQueryArguments['projection']> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!optionsEnded && argument === '--') {
      optionsEnded = true;
      continue;
    }
    if (!optionsEnded && (argument === '--limit' || argument === '--offset')) {
      if (!allowPagination) {
        return { operands, limit, parseError: `Unknown option for ${command}: ${argument}` };
      }
      const minimum = argument === '--limit' ? 1 : 0;
      const value = parseInteger(argv[index + 1], minimum);
      if (value === undefined) {
        const requirement = argument === '--limit' ? 'a positive integer' : 'a non-negative integer';
        return { operands, limit, parseError: `${argument} requires ${requirement}` };
      }
      if (argument === '--limit') limit = value;
      else offset = value;
      index += 1;
      continue;
    }
    if (!optionsEnded && (
      argument === '--filter'
      || argument === '--node-type'
      || argument === '--edge-type'
    )) {
      const optionValue = argv[index + 1];
      const values = !optionValue || optionValue.startsWith('-')
        ? []
        : optionValue.split(',').map(value => value.trim()).filter(Boolean);
      if (values.length === 0) {
        return { operands, limit, parseError: `${argument} requires a comma-separated list` };
      }
      const key = argument === '--filter'
        ? 'filterPatterns'
        : argument === '--node-type' ? 'nodeTypes' : 'edgeTypes';
      projection[key] = [...new Set([...(projection[key] ?? []), ...values])];
      index += 1;
      continue;
    }
    if (!optionsEnded && argument.startsWith('-')) {
      return { operands, limit, parseError: `Unknown option for ${command}: ${argument}` };
    }
    operands.push(argument);
  }

  return {
    operands,
    limit,
    ...(offset !== undefined ? { offset } : {}),
    ...(Object.keys(projection).length > 0 ? { projection } : {}),
  };
}

function requireOperands(command: string, args: string[], count: number, usage: string): CliCommand | undefined {
  if (args.length < count) return parseError(command, `${command} requires ${usage}`);
  if (args.length > count) return parseError(command, `Unexpected argument for ${command}: ${args[count]}`);
  return undefined;
}

function query(
  invokedCommand: string,
  report: GraphQueryReport,
  arguments_: Record<string, unknown>,
  projection?: ParsedQueryArguments['projection'],
): CliCommand {
  return {
    name: 'query',
    ...(invokedCommand === report ? {} : { invokedCommand }),
    report,
    arguments: arguments_,
    ...(projection ? { projection } : {}),
  };
}

export function parseQueryCommand(argv: string[]): CliCommand {
  const [command = '', ...rawArgs] = argv;
  if (!isGraphQueryReport(command)) {
    return parseError(command, `Unknown query command: ${command}`);
  }

  const acceptsPagination = command !== 'path';
  const parsed = parseArguments(command, rawArgs, acceptsPagination);
  if (parsed.parseError) return parseError(command, parsed.parseError);
  const { operands, limit, offset, projection } = parsed;
  const page = { limit, ...(offset !== undefined ? { offset } : {}) };

  switch (command) {
    case 'nodes':
    case 'edges': {
      const invalid = requireOperands(command, operands, 0, '');
      return invalid ?? query(command, command, page, projection);
    }
    case 'search': {
      const invalid = requireOperands(command, operands, 1, '<text>');
      return invalid ?? query(command, 'nodes', { search: operands[0], ...page }, projection);
    }
    case 'dependencies': {
      const invalid = requireOperands(command, operands, 1, '<node>');
      return invalid ?? query(command, 'edges', {
        from: operands[0], expandFileSelectors: true, projectFileEndpoints: true, ...page,
      }, projection);
    }
    case 'dependents': {
      const invalid = requireOperands(command, operands, 1, '<node>');
      return invalid ?? query(command, 'edges', {
        to: operands[0], expandFileSelectors: true, projectFileEndpoints: true, ...page,
      }, projection);
    }
    case 'path': {
      const invalid = requireOperands(command, operands, 2, '<from> <to>');
      return invalid ?? query(command, 'paths', {
        from: operands[0],
        to: operands[1],
        maxDepth: DEFAULT_MAX_DEPTH,
        maxPaths: DEFAULT_MAX_PATHS,
        expandFileSelectors: true,
        projectFileEndpoints: true,
      }, projection);
    }
  }

  return parseError(command, `Unknown query command: ${command}`);
}
