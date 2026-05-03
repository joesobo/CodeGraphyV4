import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import type { GraphQueryInput, GraphQueryResult } from './model';

export type CoreExtensionRequestAction = 'index' | 'query';

export interface CoreExtensionBridgeInput {
  action: CoreExtensionRequestAction;
  repo: string;
  query?: Omit<GraphQueryInput, 'repo'>;
}

export type CoreExtensionBridgeResponse =
  | {
    requestId: string;
    repo: string;
    status: 'failed';
    error: string;
  }
  | {
    requestId: string;
    repo: string;
    status: 'indexed';
  }
  | {
    requestId: string;
    repo: string;
    status: 'ok';
    result: GraphQueryResult;
  };

interface CommandResult {
  status: number | null;
  stderr?: string | Buffer | null;
  error?: Error;
}

const DEFAULT_RESPONSE_TIMEOUT_MS = 5 * 60 * 1000;

export interface CoreExtensionBridgeDependencies {
  createRequestId(): string;
  createTempDir(): Promise<string>;
  platform: NodeJS.Platform;
  runCommand(command: string, args: string[]): CommandResult;
  waitForResponseFile(filePath: string): Promise<string>;
  writeFile(filePath: string, contents: string): Promise<void>;
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

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForResponseFile(filePath: string): Promise<string> {
  const deadline = Date.now() + DEFAULT_RESPONSE_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      if (
        typeof error === 'object'
        && error !== null
        && 'code' in error
        && error.code === 'ENOENT'
      ) {
        await sleep(100);
        continue;
      }

      throw error;
    }
  }

  throw new Error(
    `Timed out after ${Math.round(DEFAULT_RESPONSE_TIMEOUT_MS / 1000)}s waiting for ${filePath}`,
  );
}

const DEFAULT_DEPENDENCIES: CoreExtensionBridgeDependencies = {
  createRequestId: randomUUID,
  createTempDir: () => fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-agent-')),
  platform: process.platform,
  runCommand,
  waitForResponseFile,
  writeFile: (filePath, contents) => fs.writeFile(filePath, contents, 'utf8'),
};

function createCoreExtensionUri(action: CoreExtensionRequestAction, requestPath: string): string {
  const query = new URLSearchParams({ request: requestPath });
  return `vscode://codegraphy.codegraphy/${action}?${query.toString()}`;
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

function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function sendCoreExtensionRequest(
  input: CoreExtensionBridgeInput,
  dependencies: CoreExtensionBridgeDependencies = DEFAULT_DEPENDENCIES,
): Promise<CoreExtensionBridgeResponse> {
  const requestId = dependencies.createRequestId();
  const tempDir = await dependencies.createTempDir();
  const requestPath = path.join(tempDir, 'request.json');
  const responsePath = path.join(tempDir, 'response.json');
  const repo = path.resolve(input.repo);

  await dependencies.writeFile(
    requestPath,
    `${JSON.stringify({
      repo,
      requestId,
      responsePath,
      ...(input.query ? { query: input.query } : {}),
    }, null, 2)}\n`,
  );

  const uri = createCoreExtensionUri(input.action, requestPath);
  const openUriCommand = createOpenUriCommand(dependencies.platform, uri);
  const openUriResult = dependencies.runCommand(openUriCommand.command, openUriCommand.args);

  if (!didCommandSucceed(openUriResult)) {
    return {
      requestId,
      repo,
      status: 'failed',
      error: formatCommandFailure(openUriCommand.command, openUriCommand.args, openUriResult),
    };
  }

  try {
    return JSON.parse(await dependencies.waitForResponseFile(responsePath)) as CoreExtensionBridgeResponse;
  } catch (error) {
    return {
      requestId,
      repo,
      status: 'failed',
      error: `CodeGraphy Core Extension did not write a response: ${formatErrorMessage(error)}`,
    };
  }
}
