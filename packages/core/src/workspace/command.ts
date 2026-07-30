import type { DiagnosticEventSink } from '../diagnostics/events';
import type { GraphQueryRequest } from '../graphQuery';
import { resolveCodeGraphyWorkspacePath } from './requestPaths';
import { requestCodeGraphyIndexWorkspace } from './requestIndexing';
import { requestWorkspaceGraphQuery } from './requestQuery';
import { readCodeGraphyWorkspaceStatusForCli } from './requestStatus';
import type {
  IndexWorkspaceResult,
  WorkspaceGraphQueryInput,
  WorkspaceGraphQueryProjection,
  WorkspaceGraphQueryResult,
  WorkspacePathInput,
  WorkspaceStatusResult,
} from './requestTypes';

export type CodeGraphyWorkspaceCommandName = 'index' | 'query' | 'status';

interface CodeGraphyWorkspaceCommandBase {
  diagnostics?: DiagnosticEventSink;
  workspacePath?: string;
}

export type CodeGraphyWorkspaceCommand =
  | CodeGraphyWorkspaceCommandBase & {
    command: 'index';
  }
  | CodeGraphyWorkspaceCommandBase & {
    command: 'query';
    projection?: WorkspaceGraphQueryProjection;
    query: GraphQueryRequest;
  }
  | CodeGraphyWorkspaceCommandBase & {
    command: 'status';
  };

export type CodeGraphyWorkspaceIncompleteReason =
  | 'cache-missing'
  | 'command-failed'
  | 'file-budget-reached'
  | 'page-truncated'
  | 'path-limit-reached'
  | 'relationship-limit-reached'
  | 'source-files-skipped';

export interface CodeGraphyWorkspaceCommandMetadata {
  workspaceRoot: string;
  cache: {
    state: WorkspaceStatusResult['state'];
    staleReasons: string[];
  };
  result: {
    complete: boolean;
    reasons: CodeGraphyWorkspaceIncompleteReason[];
  };
}

export type CodeGraphyWorkspaceCommandResponse =
  | {
    ok: true;
    command: CodeGraphyWorkspaceCommandName;
    data: IndexWorkspaceResult | WorkspaceGraphQueryResult | WorkspaceStatusResult;
    metadata: CodeGraphyWorkspaceCommandMetadata;
  }
  | {
    ok: false;
    command: CodeGraphyWorkspaceCommandName;
    error: {
      code: string;
      message: string;
    };
    metadata: CodeGraphyWorkspaceCommandMetadata;
  };

export interface CodeGraphyWorkspaceCommandDependencies {
  cwd(): string;
  indexWorkspace(input: WorkspacePathInput): Promise<IndexWorkspaceResult>;
  queryWorkspace(input: WorkspaceGraphQueryInput): Promise<WorkspaceGraphQueryResult>;
  readStatus(input: WorkspacePathInput): WorkspaceStatusResult;
}

const DEFAULT_DEPENDENCIES: CodeGraphyWorkspaceCommandDependencies = {
  cwd: () => process.cwd(),
  indexWorkspace: requestCodeGraphyIndexWorkspace,
  queryWorkspace: requestWorkspaceGraphQuery,
  readStatus: readCodeGraphyWorkspaceStatusForCli,
};

function readResultObject(result: unknown): Record<string, unknown> {
  return typeof result === 'object' && result !== null
    ? result as Record<string, unknown>
    : {};
}

function collectQueryIncompleteReasons(
  result: WorkspaceGraphQueryResult,
): CodeGraphyWorkspaceIncompleteReason[] {
  const reasons: CodeGraphyWorkspaceIncompleteReason[] = [];
  const value = readResultObject(result);
  const page = readResultObject(value.page);
  if (page.nextOffset !== null && page.nextOffset !== undefined) {
    reasons.push('page-truncated');
  }
  if (value.complete === false) {
    reasons.push('path-limit-reached');
  }
  const limits = readResultObject(value.limits);
  if (limits.complete === false) {
    reasons.push('relationship-limit-reached');
  }
  const sources = readResultObject(value.sources);
  const text = readResultObject(sources.text);
  if (typeof text.filesSkipped === 'number' && text.filesSkipped > 0) {
    reasons.push('source-files-skipped');
  }
  return reasons;
}

function createMetadata(
  workspaceRoot: string,
  status: WorkspaceStatusResult,
  reasons: CodeGraphyWorkspaceIncompleteReason[],
): CodeGraphyWorkspaceCommandMetadata {
  return {
    workspaceRoot,
    cache: {
      state: status.state,
      staleReasons: status.staleReasons,
    },
    result: {
      complete: reasons.length === 0,
      reasons,
    },
  };
}

function readError(result: WorkspaceGraphQueryResult): { code: string; message: string } | undefined {
  const value = readResultObject(result);
  return typeof value.error === 'string'
    ? {
        code: value.error,
        message: typeof value.message === 'string' ? value.message : value.error,
      }
    : undefined;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function executeCodeGraphyWorkspaceCommand(
  input: CodeGraphyWorkspaceCommand,
  dependencies: CodeGraphyWorkspaceCommandDependencies = DEFAULT_DEPENDENCIES,
): Promise<CodeGraphyWorkspaceCommandResponse> {
  const workspaceRoot = resolveCodeGraphyWorkspacePath(input.workspacePath, dependencies.cwd());
  const pathInput: WorkspacePathInput = {
    workspacePath: workspaceRoot,
    ...(input.diagnostics ? { diagnostics: input.diagnostics } : {}),
  };

  try {
    if (input.command === 'status') {
      const data = dependencies.readStatus(pathInput);
      return {
        ok: true,
        command: input.command,
        data,
        metadata: createMetadata(workspaceRoot, data, []),
      };
    }

    if (input.command === 'index') {
      const data = await dependencies.indexWorkspace(pathInput);
      const status = dependencies.readStatus(pathInput);
      const reasons: CodeGraphyWorkspaceIncompleteReason[] = data.discovery.limitReached
        ? ['file-budget-reached']
        : [];
      return {
        ok: true,
        command: input.command,
        data,
        metadata: createMetadata(workspaceRoot, status, reasons),
      };
    }

    const data = await dependencies.queryWorkspace({
      ...input.query,
      workspacePath: workspaceRoot,
      ...(input.projection ? { projection: input.projection } : {}),
      ...(input.diagnostics ? { diagnostics: input.diagnostics } : {}),
    });
    const status = dependencies.readStatus(pathInput);
    const error = readError(data);
    if (error) {
      return {
        ok: false,
        command: input.command,
        error,
        metadata: createMetadata(workspaceRoot, status, ['cache-missing']),
      };
    }
    return {
      ok: true,
      command: input.command,
      data,
      metadata: createMetadata(workspaceRoot, status, collectQueryIncompleteReasons(data)),
    };
  } catch (error) {
    const status = dependencies.readStatus(pathInput);
    return {
      ok: false,
      command: input.command,
      error: {
        code: 'workspace_command_failed',
        message: formatError(error),
      },
      metadata: createMetadata(workspaceRoot, status, ['command-failed']),
    };
  }
}
