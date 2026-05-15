import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getWorkspaceDatabasePath } from '../database/paths';
import type { OpenRepoInput, OpenRepoResult, ToolErrorResult } from './model';

interface CommandResult {
  status: number | null;
  stderr?: string | Buffer | null;
  error?: Error;
}

export interface OpenRepoDependencies {
  runCommand(command: string, args: string[]): CommandResult;
  graphCacheExists(repo: string): boolean;
}

function runCommand(command: string, args: string[]): CommandResult {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  return {
    status: result.status,
    stderr: result.stderr,
    error: result.error,
  };
}

const DEFAULT_DEPENDENCIES: OpenRepoDependencies = {
  runCommand,
  graphCacheExists: (repo) => fs.existsSync(getWorkspaceDatabasePath(repo)),
};

function formatStderr(stderr: CommandResult['stderr']): string | undefined {
  if (!stderr) {
    return undefined;
  }

  return Buffer.isBuffer(stderr) ? stderr.toString('utf8').trim() : stderr.trim();
}

function formatCommandFailure(command: string, args: string[], result: CommandResult): string {
  const detail = formatStderr(result.stderr) || result.error?.message || `exit code ${result.status ?? 'unknown'}`;
  return `\`${[command, ...args].join(' ')}\` failed: ${detail}`;
}

function didCommandSucceed(result: CommandResult): boolean {
  return result.status === 0 && !result.error;
}

export function requestCodeGraphyOpenRepo(
  input: OpenRepoInput,
  dependencies: OpenRepoDependencies = DEFAULT_DEPENDENCIES,
): OpenRepoResult | ToolErrorResult {
  const repo = path.resolve(input.repoPath);
  const focusResult = dependencies.runCommand('code', [repo]);

  if (!didCommandSucceed(focusResult)) {
    return {
      error: 'core_extension_unavailable',
      message: `Could not open the repo in VS Code. ${formatCommandFailure('code', [repo], focusResult)}`,
    };
  }

  const graphCacheExists = dependencies.graphCacheExists(repo);

  return {
    repo,
    graphCacheExists,
    message: graphCacheExists
      ? 'CodeGraphy repo opened.'
      : 'Graph Cache has not been created yet. Run `codegraphy_index_repo()` before querying.',
  };
}
