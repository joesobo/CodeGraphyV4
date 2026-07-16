import * as path from 'node:path';
import { requestWorkspaceGraphQuery } from '../../workspace/requestQuery';
import { resolveCodeGraphyWorkspacePath } from '../../workspace/requestPaths';
import type { WorkspaceGraphQueryInput, WorkspaceGraphQueryResult } from '../../workspace/requestTypes';
import type { CliCommand } from '../parseTypes';
import type { CommandExecutionResult } from '../command';

interface QueryCommandDependencies {
  cwd(): string;
  query(input: WorkspaceGraphQueryInput): Promise<WorkspaceGraphQueryResult>;
}

const DEFAULT_DEPENDENCIES: QueryCommandDependencies = {
  cwd: () => process.cwd(),
  query: requestWorkspaceGraphQuery,
};

const PATH_ARGUMENTS = ['from', 'to', 'filePath', 'relatedFrom', 'relatedTo'] as const;

function normalizeWorkspaceSelector(selector: string, workspaceRoot: string): string {
  if (path.isAbsolute(selector)) {
    const relativePath = path.relative(workspaceRoot, selector);
    if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      throw new Error(`Query path is outside the workspace: ${selector}`);
    }
    return relativePath.split(path.sep).join('/');
  }

  const normalized = path.posix.normalize(selector.replace(/\\/g, '/'));
  if (normalized === '..' || normalized.startsWith('../')) {
    throw new Error(`Query path is outside the workspace: ${selector}`);
  }
  return normalized;
}

function normalizeQueryArguments(
  queryArguments: Record<string, unknown>,
  workspaceRoot: string,
): Record<string, unknown> {
  const normalized = { ...queryArguments };
  for (const key of PATH_ARGUMENTS) {
    const value = normalized[key];
    if (typeof value === 'string') {
      normalized[key] = normalizeWorkspaceSelector(value, workspaceRoot);
    }
  }
  return normalized;
}

function compactQueryResult(result: WorkspaceGraphQueryResult): WorkspaceGraphQueryResult {
  const report = { ...result };
  delete report.cacheStatus;
  delete report.workspaceRoot;
  return report;
}

export async function runQueryCommand(
  command: CliCommand,
  dependencies: QueryCommandDependencies = DEFAULT_DEPENDENCIES,
): Promise<CommandExecutionResult> {
  if (!command.report) {
    return {
      exitCode: 2,
      output: JSON.stringify({ error: 'invalid_arguments', message: 'Missing query report' }),
    };
  }

  const workspaceRoot = resolveCodeGraphyWorkspacePath(command.workspacePath, dependencies.cwd());
  try {
    const result = await dependencies.query({
      workspacePath: workspaceRoot,
      report: command.report,
      arguments: normalizeQueryArguments(command.arguments ?? {}, workspaceRoot),
    });
    return {
      exitCode: result.error ? 1 : 0,
      output: JSON.stringify(compactQueryResult(result)),
    };
  } catch (error) {
    return {
      exitCode: 2,
      output: JSON.stringify({
        error: 'invalid_arguments',
        message: error instanceof Error ? error.message : String(error),
      }),
    };
  }
}
