import type { GraphQueryReport, WorkspaceGraphQueryProjection } from '../workspace/requestTypes';
import type { CliCommand } from './parseTypes';

const QUERY_COMMANDS = new Set([
  'dependencies',
  'dependents',
  'edges',
  'impact',
  'nodes',
  'path',
  'query',
  'search',
]);

const DEFAULT_LIMIT = 100;
const DEFAULT_SEARCH_LIMIT = 20;
const DEFAULT_IMPACT_LIMIT = 10;
const DEFAULT_IMPACT_DEPTH = 2;
const MAX_IMPACT_DEPTH = 4;
const DEFAULT_MAX_DEPTH = 6;
const DEFAULT_MAX_PATHS = 5;

interface ParsedQueryArguments {
  operands: string[];
  depth?: number;
  limit: number;
  offset?: number;
  parseError?: string;
  projection?: WorkspaceGraphQueryProjection;
}

interface QueryBuilderInput {
  command: string;
  operands: string[];
  page: { limit: number; offset?: number };
  projection?: WorkspaceGraphQueryProjection;
  depth?: number;
}

type ParsedOption =
  | { type: 'depth' | 'limit' | 'offset'; value: number }
  | { type: 'projection'; key: keyof WorkspaceGraphQueryProjection; values: string[] }
  | { type: 'error'; message: string };

const PROJECTION_OPTION_KEYS: Record<string, keyof WorkspaceGraphQueryProjection> = {
  '--filter': 'filterPatterns',
  '--node-type': 'nodeTypes',
  '--edge-type': 'edgeTypes',
};

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

function parsePaginationOption(
  command: string,
  argument: '--limit' | '--offset',
  value: string | undefined,
  allowPagination: boolean,
): ParsedOption {
  if (!allowPagination) return { type: 'error', message: `Unknown option for ${command}: ${argument}` };
  const minimum = argument === '--limit' ? 1 : 0;
  const parsed = parseInteger(value, minimum);
  if (parsed !== undefined) return { type: argument === '--limit' ? 'limit' : 'offset', value: parsed };
  const requirement = argument === '--limit' ? 'a positive integer' : 'a non-negative integer';
  return { type: 'error', message: `${argument} requires ${requirement}` };
}

function parseProjectionOption(
  argument: string,
  value: string | undefined,
  key: keyof WorkspaceGraphQueryProjection,
): ParsedOption {
  const values = !value || value.startsWith('-')
    ? []
    : value.split(',').map(item => item.trim()).filter(Boolean);
  return values.length > 0
    ? { type: 'projection', key, values }
    : { type: 'error', message: `${argument} requires a comma-separated list` };
}

function parseOption(
  command: string,
  argument: string,
  value: string | undefined,
  allowPagination: boolean,
): ParsedOption | undefined {
  if (argument === '--limit' || argument === '--offset') {
    return parsePaginationOption(command, argument, value, allowPagination);
  }
  if (argument === '--depth' && command === 'impact') {
    const depth = parseInteger(value, 1);
    return depth !== undefined && depth <= MAX_IMPACT_DEPTH
      ? { type: 'depth', value: depth }
      : { type: 'error', message: `--depth requires an integer from 1 through ${MAX_IMPACT_DEPTH}` };
  }
  const projectionKey = PROJECTION_OPTION_KEYS[argument];
  return projectionKey ? parseProjectionOption(argument, value, projectionKey) : undefined;
}

function applyOption(
  parsed: ParsedOption,
  state: { depth?: number; limit: number; offset?: number; projection: WorkspaceGraphQueryProjection },
): void {
  if (parsed.type === 'depth') state.depth = parsed.value;
  if (parsed.type === 'limit') state.limit = parsed.value;
  if (parsed.type === 'offset') state.offset = parsed.value;
  if (parsed.type === 'projection') {
    state.projection[parsed.key] = [...new Set([...(state.projection[parsed.key] ?? []), ...parsed.values])];
  }
}

function completeParsedArguments(
  operands: string[],
  state: { depth?: number; limit: number; offset?: number; projection: WorkspaceGraphQueryProjection },
): ParsedQueryArguments {
  return {
    operands,
    ...(state.depth !== undefined ? { depth: state.depth } : {}),
    limit: state.limit,
    ...(state.offset !== undefined ? { offset: state.offset } : {}),
    ...(Object.keys(state.projection).length > 0 ? { projection: state.projection } : {}),
  };
}

function parseArguments(
  command: string,
  argv: string[],
  allowPagination: boolean,
  defaultLimit = DEFAULT_LIMIT,
): ParsedQueryArguments {
  const operands: string[] = [];
  const state: { depth?: number; limit: number; offset?: number; projection: WorkspaceGraphQueryProjection } = {
    limit: defaultLimit,
    projection: {},
  };
  let optionsEnded = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (optionsEnded) {
      operands.push(argument);
      continue;
    }
    if (argument === '--') {
      optionsEnded = true;
      continue;
    }
    const option = parseOption(command, argument, argv[index + 1], allowPagination);
    if (option?.type === 'error') return { operands, limit: state.limit, parseError: option.message };
    if (option) {
      applyOption(option, state);
      index += 1;
      continue;
    }
    if (argument.startsWith('-')) {
      return { operands, limit: state.limit, parseError: `Unknown option for ${command}: ${argument}` };
    }
    operands.push(argument);
  }

  return completeParsedArguments(operands, state);
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
  projection?: WorkspaceGraphQueryProjection,
): CliCommand {
  return {
    name: 'query',
    ...(invokedCommand === report ? {} : { invokedCommand }),
    report,
    arguments: arguments_,
    ...(projection ? { projection } : {}),
  };
}

function buildList(input: QueryBuilderInput): CliCommand {
  const invalid = requireOperands(input.command, input.operands, 0, '');
  return invalid ?? query(input.command, input.command as 'nodes' | 'edges', input.page, input.projection);
}

function buildSearch(input: QueryBuilderInput): CliCommand {
  const invalid = requireOperands(input.command, input.operands, 1, '<pattern>');
  if (invalid) return invalid;
  if (!input.operands[0].replace(/\*/g, '').trim()) {
    return parseError(input.command, 'search pattern must contain a literal character');
  }
  return query(input.command, 'search', { pattern: input.operands[0], ...input.page }, input.projection);
}

function buildImpact(input: QueryBuilderInput): CliCommand {
  const invalid = requireOperands(input.command, input.operands, 1, '<node>');
  return invalid ?? query(input.command, 'impact', {
    target: input.operands[0],
    maxDepth: input.depth ?? DEFAULT_IMPACT_DEPTH,
    ...input.page,
  }, input.projection);
}

function buildOverview(input: QueryBuilderInput): CliCommand {
  const invalid = requireOperands(input.command, input.operands, 1, '<node>');
  return invalid ?? query(input.command, 'overview', { target: input.operands[0] }, input.projection);
}

function buildConnection(input: QueryBuilderInput, endpoint: 'from' | 'to'): CliCommand {
  const invalid = requireOperands(input.command, input.operands, 1, '<node>');
  return invalid ?? query(input.command, 'edges', {
    [endpoint]: input.operands[0],
    expandFileSelectors: true,
    projectFileEndpoints: true,
    ...input.page,
  }, input.projection);
}

function buildPath(input: QueryBuilderInput): CliCommand {
  const invalid = requireOperands(input.command, input.operands, 2, '<from> <to>');
  return invalid ?? query(input.command, 'paths', {
    from: input.operands[0],
    to: input.operands[1],
    maxDepth: DEFAULT_MAX_DEPTH,
    maxPaths: DEFAULT_MAX_PATHS,
    expandFileSelectors: true,
    projectFileEndpoints: true,
  }, input.projection);
}

const QUERY_BUILDERS: Record<string, (input: QueryBuilderInput) => CliCommand> = {
  nodes: buildList,
  edges: buildList,
  search: buildSearch,
  impact: buildImpact,
  query: buildOverview,
  dependencies: input => buildConnection(input, 'from'),
  dependents: input => buildConnection(input, 'to'),
  path: buildPath,
};

export function parseQueryCommand(argv: string[]): CliCommand {
  const [command = '', ...rawArgs] = argv;
  const builder = QUERY_BUILDERS[command];
  if (!builder) return parseError(command, `Unknown query command: ${command}`);
  const parsed = parseArguments(
    command,
    rawArgs,
    command !== 'path' && command !== 'query',
    command === 'search'
      ? DEFAULT_SEARCH_LIMIT
      : command === 'impact'
        ? DEFAULT_IMPACT_LIMIT
        : DEFAULT_LIMIT,
  );
  if (parsed.parseError) return parseError(command, parsed.parseError);
  return builder({
    command,
    operands: parsed.operands,
    page: {
      limit: parsed.limit,
      ...(parsed.offset !== undefined ? { offset: parsed.offset } : {}),
    },
    ...(parsed.projection ? { projection: parsed.projection } : {}),
    ...(parsed.depth !== undefined ? { depth: parsed.depth } : {}),
  });
}
