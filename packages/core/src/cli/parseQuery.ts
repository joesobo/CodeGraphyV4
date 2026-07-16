import type { GraphQueryReport } from '../workspace/requestTypes';
import type { CliCommand } from './parseTypes';

const QUERY_REPORTS = new Set<GraphQueryReport>([
  'nodes',
  'edges',
  'relationships',
  'symbols',
  'paths',
]);

const LIST_FLAGS: Record<string, string> = {
  '--limit': 'limit',
  '--offset': 'offset',
  '--search': 'search',
};

const REPORT_FLAGS: Record<GraphQueryReport, Record<string, string>> = {
  nodes: LIST_FLAGS,
  edges: { ...LIST_FLAGS, '--from': 'from', '--to': 'to', '--edge-type': 'edgeType' },
  relationships: { ...LIST_FLAGS, '--from': 'from', '--to': 'to', '--edge-type': 'edgeType' },
  symbols: {
    ...LIST_FLAGS,
    '--file': 'filePath',
    '--related-from': 'relatedFrom',
    '--related-to': 'relatedTo',
    '--edge-type': 'edgeType',
  },
  paths: { '--from': 'from', '--to': 'to', '--max-depth': 'maxDepth', '--max-paths': 'maxPaths' },
};

const INTEGER_LIMITS: Record<string, { min: number; max: number }> = {
  limit: { min: 1, max: 500 },
  offset: { min: 0, max: Number.MAX_SAFE_INTEGER },
  maxDepth: { min: 1, max: 25 },
  maxPaths: { min: 1, max: 20 },
};

function parseError(message: string): CliCommand {
  return { name: 'query', parseError: message };
}

function parseOptionValue(
  flag: string,
  key: string,
  value: string | undefined,
): string | number | CliCommand {
  if (value === undefined || value.startsWith('--')) {
    return parseError(`Missing value for ${flag}`);
  }

  const bounds = INTEGER_LIMITS[key];
  if (!bounds) {
    return value;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < bounds.min || parsed > bounds.max) {
    return parseError(
      `Invalid value for ${flag}: expected an integer from ${bounds.min} to ${bounds.max}`,
    );
  }

  return parsed;
}

export function parseQueryCommand(argv: string[]): CliCommand {
  const [reportInput, ...args] = argv;
  if (!reportInput || !QUERY_REPORTS.has(reportInput as GraphQueryReport)) {
    return parseError(`Unknown query report: ${reportInput ?? ''}`);
  }

  const report = reportInput as GraphQueryReport;
  const supportedFlags = REPORT_FLAGS[report];
  const queryArguments: Record<string, unknown> = report === 'paths' ? {} : { limit: 100 };
  let workspacePath: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument.startsWith('--')) {
      if (workspacePath) {
        return parseError(`Unexpected positional argument: ${argument}`);
      }
      workspacePath = argument;
      continue;
    }

    const key = supportedFlags[argument];
    if (!key) {
      return parseError(`Unknown option for query ${report}: ${argument}`);
    }

    const parsed = parseOptionValue(argument, key, args[index + 1]);
    if (typeof parsed === 'object') {
      return parsed;
    }
    queryArguments[key] = parsed;
    index += 1;
  }

  if (report === 'paths' && (!queryArguments.from || !queryArguments.to)) {
    return parseError('query paths requires --from and --to');
  }

  return {
    name: 'query',
    report,
    arguments: queryArguments,
    ...(workspacePath ? { workspacePath } : {}),
  };
}
