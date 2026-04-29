import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readRepoStatus } from '../repoStatus/read';
import type { RepoStatusResult } from '../repoStatus/model';

export type ReindexRequestStatus = 'failed' | 'fresh' | 'requested' | 'timed-out';

export interface ReindexRequestInput {
  repoPath: string;
  wait?: boolean;
  timeoutMs?: number;
  pollIntervalMs?: number;
}

export interface ReindexRequestResult {
  [key: string]: unknown;
  repo: string;
  requestId: string;
  uri: string;
  status: ReindexRequestStatus;
  waited: boolean;
  timeoutMs: number;
  pollIntervalMs: number;
  before: RepoStatusResult;
  after: RepoStatusResult;
  limitations: string[];
}

interface CommandResult {
  status: number | null;
  stderr?: string | Buffer | null;
  error?: Error;
}

export interface ReindexRequestDependencies {
  platform: NodeJS.Platform;
  createRequestId(): string;
  now(): number;
  sleep(ms: number): Promise<void>;
  readRepoStatus(repoPath: string): RepoStatusResult;
  runCommand(command: string, args: string[]): CommandResult;
}

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_POLL_INTERVAL_MS = 1000;

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

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const DEFAULT_DEPENDENCIES: ReindexRequestDependencies = {
  platform: process.platform,
  createRequestId: randomUUID,
  now: () => Date.now(),
  sleep,
  readRepoStatus,
  runCommand,
};

function createReindexUri(repo: string, requestId: string): string {
  const query = new URLSearchParams({ repo, requestId });
  return `vscode://codegraphy.codegraphy/reindex?${query.toString()}`;
}

function createOpenUriCommand(platform: NodeJS.Platform, uri: string): { command: string; args: string[] } {
  if (platform === 'darwin') {
    return { command: 'open', args: [uri] };
  }

  if (platform === 'win32') {
    return { command: 'cmd', args: ['/c', 'start', '', uri] };
  }

  return { command: 'xdg-open', args: [uri] };
}

function didCommandSucceed(result: CommandResult): boolean {
  return result.status === 0 && !result.error;
}

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

function createResult(
  input: {
    repo: string;
    requestId: string;
    uri: string;
    status: ReindexRequestStatus;
    waited: boolean;
    timeoutMs: number;
    pollIntervalMs: number;
    before: RepoStatusResult;
    after: RepoStatusResult;
    limitations?: string[];
  },
): ReindexRequestResult {
  return {
    repo: input.repo,
    requestId: input.requestId,
    uri: input.uri,
    status: input.status,
    waited: input.waited,
    timeoutMs: input.timeoutMs,
    pollIntervalMs: input.pollIntervalMs,
    before: input.before,
    after: input.after,
    limitations: input.limitations ?? [],
  };
}

export async function requestCodeGraphyReindex(
  input: ReindexRequestInput,
  dependencies: ReindexRequestDependencies = DEFAULT_DEPENDENCIES,
): Promise<ReindexRequestResult> {
  const repo = path.resolve(input.repoPath);
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pollIntervalMs = input.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const shouldWait = input.wait ?? true;
  const requestId = dependencies.createRequestId();
  const uri = createReindexUri(repo, requestId);
  const before = dependencies.readRepoStatus(repo);
  const focusResult = dependencies.runCommand('code', [repo]);

  if (!didCommandSucceed(focusResult)) {
    return createResult({
      repo,
      requestId,
      uri,
      status: 'failed',
      waited: false,
      timeoutMs,
      pollIntervalMs,
      before,
      after: before,
      limitations: [formatCommandFailure('code', [repo], focusResult)],
    });
  }

  const openUriCommand = createOpenUriCommand(dependencies.platform, uri);
  const openUriResult = dependencies.runCommand(openUriCommand.command, openUriCommand.args);

  if (!didCommandSucceed(openUriResult)) {
    return createResult({
      repo,
      requestId,
      uri,
      status: 'failed',
      waited: false,
      timeoutMs,
      pollIntervalMs,
      before,
      after: before,
      limitations: [formatCommandFailure(openUriCommand.command, openUriCommand.args, openUriResult)],
    });
  }

  let after = dependencies.readRepoStatus(repo);
  if (!shouldWait) {
    return createResult({
      repo,
      requestId,
      uri,
      status: 'requested',
      waited: false,
      timeoutMs,
      pollIntervalMs,
      before,
      after,
    });
  }

  const deadline = dependencies.now() + timeoutMs;
  while (after.freshness !== 'fresh' && dependencies.now() < deadline) {
    await dependencies.sleep(pollIntervalMs);
    after = dependencies.readRepoStatus(repo);
  }

  if (after.freshness === 'fresh') {
    return createResult({
      repo,
      requestId,
      uri,
      status: 'fresh',
      waited: true,
      timeoutMs,
      pollIntervalMs,
      before,
      after,
    });
  }

  return createResult({
    repo,
    requestId,
    uri,
    status: 'timed-out',
    waited: true,
    timeoutMs,
    pollIntervalMs,
    before,
    after,
    limitations: ['Timed out waiting for CodeGraphy index freshness.'],
  });
}
