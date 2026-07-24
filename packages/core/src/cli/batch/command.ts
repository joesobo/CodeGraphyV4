import type { DiagnosticEvent, DiagnosticEventSink } from '../../diagnostics/events';
import { formatDiagnosticEventLine } from '../../diagnostics/events';
import { resolveCodeGraphyWorkspacePath } from '../../workspace/requestPaths';
import { requestWorkspaceGraphQueryBatch } from '../../workspace/requestQuery';
import {
  MAX_WORKSPACE_GRAPH_QUERY_BATCH_SIZE,
  type WorkspaceGraphQueryBatchInput,
  type WorkspaceGraphQueryBatchResult,
} from '../../workspace/requestTypes';
import type { CommandExecutionResult } from '../command';
import type { CliCommand } from '../parseTypes';
import { parseQueryCommand } from '../parseQuery';
import { normalizeQueryArguments } from '../query/command';

interface BatchInputItem {
  argv: string[];
  id: string;
}

interface BatchCommandDependencies {
  cwd(): string;
  queryBatch(input: WorkspaceGraphQueryBatchInput): Promise<WorkspaceGraphQueryBatchResult>;
  readInput(): Promise<string>;
}

interface BatchCommandOptions {
  writeDiagnostic?(line: string): void;
}

const MAX_BATCH_INPUT_BYTES = 1024 * 1024;

async function readStandardInput(): Promise<string> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of process.stdin as AsyncIterable<Uint8Array>) {
    const buffer = Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > MAX_BATCH_INPUT_BYTES) {
      throw new Error(`Batch input exceeds ${MAX_BATCH_INPUT_BYTES} bytes`);
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

const DEFAULT_DEPENDENCIES: BatchCommandDependencies = {
  cwd: () => process.cwd(),
  queryBatch: requestWorkspaceGraphQueryBatch,
  readInput: readStandardInput,
};

function invalid(message: string): CommandExecutionResult {
  return {
    exitCode: 2,
    output: JSON.stringify({ error: 'invalid_arguments', message }),
  };
}

function isNonEmptyStringArray(value: unknown): value is string[] {
  return Array.isArray(value)
    && value.length > 0
    && value.every(token => typeof token === 'string');
}

function parseBatchInput(input: string): BatchInputItem[] | CommandExecutionResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    return invalid('Batch input must be valid JSON');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return invalid('Batch input must be an object with a queries array');
  }
  const record = parsed as Record<string, unknown>;
  if (Object.keys(record).some(key => key !== 'queries') || !Array.isArray(record.queries)) {
    return invalid('Batch input must contain only a queries array');
  }
  if (record.queries.length < 1 || record.queries.length > MAX_WORKSPACE_GRAPH_QUERY_BATCH_SIZE) {
    return invalid(`Batch queries must contain 1 through ${MAX_WORKSPACE_GRAPH_QUERY_BATCH_SIZE} items`);
  }

  const items: BatchInputItem[] = [];
  const ids = new Set<string>();
  for (const value of record.queries) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return invalid('Each Batch query must be an object with id and argv');
    }
    const item = value as Record<string, unknown>;
    if (Object.keys(item).some(key => key !== 'id' && key !== 'argv')) {
      return invalid('Each Batch query must contain only id and argv');
    }
    if (typeof item.id !== 'string' || item.id.length < 1 || [...item.id].length > 128) {
      return invalid('Each Batch query id must contain 1 through 128 characters');
    }
    if (ids.has(item.id)) return invalid(`Batch query ids must be unique: ${item.id}`);
    if (!isNonEmptyStringArray(item.argv)) {
      return invalid(`Batch query ${item.id} argv must be a non-empty string array`);
    }
    ids.add(item.id);
    items.push({ id: item.id, argv: item.argv });
  }
  return items;
}

function compactResult(result: Record<string, unknown>): Record<string, unknown> {
  const compact = { ...result };
  delete compact.cacheStatus;
  delete compact.workspaceRoot;
  return compact;
}

function commandName(command: CliCommand): string {
  return command.invokedCommand ?? command.report ?? command.name;
}

export async function runBatchCommand(
  command: CliCommand,
  dependencies: BatchCommandDependencies = DEFAULT_DEPENDENCIES,
  options: BatchCommandOptions = {},
): Promise<CommandExecutionResult> {
  let input: string;
  try {
    input = await dependencies.readInput();
  } catch (error) {
    return invalid(error instanceof Error ? error.message : String(error));
  }
  if (Buffer.byteLength(input, 'utf-8') > MAX_BATCH_INPUT_BYTES) {
    return invalid(`Batch input exceeds ${MAX_BATCH_INPUT_BYTES} bytes`);
  }
  const items = parseBatchInput(input);
  if (!Array.isArray(items)) return items;

  const workspaceRoot = resolveCodeGraphyWorkspacePath(command.workspacePath, dependencies.cwd());
  const commands: CliCommand[] = [];
  const queries: WorkspaceGraphQueryBatchInput['queries'] = [];
  for (const item of items) {
    const parsed = parseQueryCommand(item.argv);
    if (parsed.parseError || parsed.name !== 'query' || !parsed.report) {
      return invalid(`Batch query ${item.id}: ${parsed.parseError ?? 'Only Graph Query commands are supported'}`);
    }
    commands.push(parsed);
    try {
      queries.push({
        report: parsed.report,
        arguments: normalizeQueryArguments(parsed.arguments ?? {}, workspaceRoot),
        ...(parsed.projection ? { projection: parsed.projection } : {}),
      });
    } catch (error) {
      return invalid(`Batch query ${item.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const diagnostics: DiagnosticEventSink | undefined = command.verbose
    ? {
        emit(event: DiagnosticEvent): void {
          const line = formatDiagnosticEventLine(event);
          if (options.writeDiagnostic) {
            options.writeDiagnostic(line);
            return;
          }
          process.stderr.write(`${line}\n`);
        },
      }
    : undefined;
  const batch = await dependencies.queryBatch({
    workspacePath: workspaceRoot,
    queries,
    ...(diagnostics ? { diagnostics } : {}),
  });
  const failedIndex = batch.results.findIndex(result => result.error);
  if (failedIndex >= 0) {
    const failed = batch.results[failedIndex];
    const item = items[failedIndex];
    const failedCommand = commandName(commands[failedIndex]);
    return {
      exitCode: 1,
      output: JSON.stringify({
        error: {
          code: 'batch_query_failed',
          message: `Batch query ${item.id} failed.`,
          action: 'Fix the failed query and retry the Batch.',
          details: {
            id: item.id,
            command: failedCommand,
            error: {
              code: typeof failed.error === 'string' ? failed.error : 'command_failed',
              message: typeof failed.message === 'string' ? failed.message : 'Command failed.',
            },
          },
        },
      }),
    };
  }

  return {
    exitCode: 0,
    output: JSON.stringify({
      results: batch.results.map((result, index) => ({
        id: items[index].id,
        command: commandName(commands[index]),
        data: compactResult(result),
      })),
    }),
  };
}
