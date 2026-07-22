import { spawn } from 'node:child_process';
import { copyFile, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { indexCodeGraphyWorkspace, type IGraphData } from '@codegraphy-dev/core';
import type { TLRecord } from '@tldraw/tlschema';
import { runTldrawCommand, type TldrawCommandDependencies } from './command';
import { writeGraphDocument } from './document/writer';
import { isCodeGraphyRecord, reconcileGraphRecords } from './document/records';
import { resolveDefaultDocumentPath } from './document/path';
import { projectDefaultFileGraph } from './graph/projection';
import { TldrawApiClient, type TldrawServerConnection } from './tldraw/api';

const HELP = `Usage: codegraphy-tldraw [PATH]

Index the current workspace and open its file graph in tldraw offline.

PATH  Create or refresh this .tldraw file. Without PATH, create or refresh CodeGraphy.tldraw.
`;

export interface CliDependencies {
  runCommand(arguments_: readonly string[]): Promise<{ documentPath: string; workspaceRoot: string }>;
  writeError(message: string): void;
  writeOutput(message: string): void;
}

export interface CliPlatform {
  copyFile(source: URL, destination: string): Promise<void>;
  createClient(connection: TldrawServerConnection): TldrawApiClient;
  currentWorkingDirectory(): string;
  homeDirectory(): string;
  indexWorkspace(workspaceRoot: string): Promise<{ graph: IGraphData }>;
  openDocument(documentPath: string): Promise<void>;
  readBytes(source: URL): Promise<Buffer>;
  readText(filePath: string): Promise<string>;
  writeGraphDocument(input: Parameters<typeof writeGraphDocument>[0]): Promise<void>;
}

type SpawnImplementation = typeof spawn;

export async function openTldrawDocument(
  documentPath: string,
  spawnImplementation: SpawnImplementation = spawn,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawnImplementation('open', ['-a', 'tldraw offline', '--', documentPath], {
      stdio: 'ignore',
    });
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`Unable to open tldraw offline (exit ${code ?? 'unknown'})`));
    });
  });
}

async function readTldrawClient(platform: CliPlatform): Promise<TldrawApiClient | undefined> {
  const serverPath = path.join(
    platform.homeDirectory(),
    'Library',
    'Application Support',
    'tldraw',
    'server.json',
  );
  try {
    const connection = JSON.parse(await platform.readText(serverPath)) as TldrawServerConnection;
    if (!Number.isInteger(connection.port) || typeof connection.token !== 'string') {
      throw new Error(`Invalid tldraw offline server file: ${serverPath}`);
    }
    return platform.createClient(connection);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

const DEFAULT_PLATFORM: CliPlatform = {
  copyFile: (source, destination) => copyFile(source, destination),
  createClient: connection => new TldrawApiClient(connection),
  currentWorkingDirectory: () => process.cwd(),
  homeDirectory: homedir,
  indexWorkspace: workspaceRoot => indexCodeGraphyWorkspace({ workspaceRoot }),
  openDocument: openTldrawDocument,
  readBytes: source => readFile(source),
  readText: filePath => readFile(filePath, 'utf8'),
  writeGraphDocument,
};

export function createCommandDependencies(
  platform: CliPlatform = DEFAULT_PLATFORM,
): TldrawCommandDependencies {
  let currentClient: TldrawApiClient | undefined;
  return {
    resolveDefaultDocumentPath,
    cwd: () => platform.currentWorkingDirectory(),
    findOpenDocument: async documentPath => {
      currentClient = await readTldrawClient(platform);
      if (!currentClient) return undefined;
      try {
        return await currentClient.findOpenDocument(documentPath);
      } catch (error) {
        if (!(error instanceof TypeError)) throw error;
        currentClient = undefined;
        return undefined;
      }
    },
    indexWorkspace: async workspaceRoot => platform.indexWorkspace(workspaceRoot),
    openDocument: documentPath => platform.openDocument(documentPath),
    refreshOpenDocument: async ({ documentId, graph }) => {
      if (!currentClient) throw new Error('tldraw offline is not available for live refresh');
      const currentShapes = await currentClient.readShapes(documentId) as TLRecord[];
      const records = reconcileGraphRecords(currentShapes, projectDefaultFileGraph(graph));
      const ownedRecords = records.filter(isCodeGraphyRecord);
      await currentClient.reconcileRecords(documentId, ownedRecords);
      const scriptWorkspace = await currentClient.getScriptWorkspace(documentId);
      await Promise.all([
        platform.copyFile(new URL('./script/config.js', import.meta.url), path.join(scriptWorkspace.scriptDir, 'config.js')),
        platform.copyFile(new URL('./script/main.js', import.meta.url), path.join(scriptWorkspace.scriptDir, 'main.js')),
      ]);
    },
    writeDocument: async ({ graph, targetPath }) => {
      const configPath = new URL('./script/config.js', import.meta.url);
      const scriptPath = new URL('./script/main.js', import.meta.url);
      await platform.writeGraphDocument({
        graph,
        scriptFiles: {
          'config.js': await platform.readBytes(configPath),
          'main.js': await platform.readBytes(scriptPath),
        },
        targetPath,
      });
      return { documentPath: targetPath };
    },
  };
}

const DEFAULT_DEPENDENCIES: CliDependencies = {
  runCommand: arguments_ => runTldrawCommand(arguments_, createCommandDependencies()),
  writeError: message => process.stderr.write(`${message}\n`),
  writeOutput: message => process.stdout.write(message),
};

export async function runCli(
  arguments_: readonly string[],
  dependencies: CliDependencies = DEFAULT_DEPENDENCIES,
): Promise<number> {
  if (arguments_.includes('--help') || arguments_.includes('-h')) {
    dependencies.writeOutput(HELP);
    return 0;
  }
  if (arguments_.length > 1) {
    dependencies.writeError('Usage: codegraphy-tldraw [PATH]');
    return 1;
  }
  if (arguments_[0] && path.extname(arguments_[0]).toLowerCase() !== '.tldraw') {
    dependencies.writeError('PATH must end in .tldraw');
    return 1;
  }
  try {
    const result = await dependencies.runCommand(arguments_);
    dependencies.writeOutput(`Opened ${result.documentPath}\n`);
    return 0;
  } catch (error) {
    dependencies.writeError(error instanceof Error ? error.message : String(error));
    return 1;
  }
}
