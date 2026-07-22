import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { indexCodeGraphyWorkspace } from '@codegraphy-dev/core';
import type { TLRecord } from '@tldraw/tlschema';
import { runTldrawCommand, type TldrawCommandDependencies } from './command';
import { writeGraphDocument } from './document/writer';
import { reconcileGraphRecords } from './document/records';
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

async function openDocument(documentPath: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn('open', ['-a', 'tldraw offline', '--', documentPath], {
      stdio: 'ignore',
    });
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`Unable to open tldraw offline (exit ${code ?? 'unknown'})`));
    });
  });
}

async function readTldrawClient(): Promise<TldrawApiClient | undefined> {
  const serverPath = path.join(
    homedir(),
    'Library',
    'Application Support',
    'tldraw',
    'server.json',
  );
  try {
    const connection = JSON.parse(await readFile(serverPath, 'utf8')) as TldrawServerConnection;
    if (!Number.isInteger(connection.port) || typeof connection.token !== 'string') {
      throw new Error(`Invalid tldraw offline server file: ${serverPath}`);
    }
    return new TldrawApiClient(connection);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

function createCommandDependencies(): TldrawCommandDependencies {
  let currentClient: TldrawApiClient | undefined;
  return {
    resolveDefaultDocumentPath,
    cwd: () => process.cwd(),
    findOpenDocument: async documentPath => {
      currentClient = await readTldrawClient();
      return currentClient?.findOpenDocument(documentPath);
    },
    indexWorkspace: async workspaceRoot => indexCodeGraphyWorkspace({ workspaceRoot }),
    openDocument,
    refreshOpenDocument: async ({ documentId, graph }) => {
      if (!currentClient) throw new Error('tldraw offline is not available for live refresh');
      const currentShapes = await currentClient.readShapes(documentId) as TLRecord[];
      const records = reconcileGraphRecords(currentShapes, projectDefaultFileGraph(graph));
      const ownedShapes = records.filter(record => (
        record.typeName === 'shape'
        && (record.meta.codegraphyKind === 'node' || record.meta.codegraphyKind === 'edge')
      ));
      await currentClient.reconcileShapes(documentId, ownedShapes);
    },
    writeDocument: async ({ graph, targetPath }) => {
      const configPath = new URL('./script/config.js', import.meta.url);
      const scriptPath = new URL('./script/main.js', import.meta.url);
      await writeGraphDocument({
        graph,
        scriptFiles: {
          'config.js': await readFile(configPath),
          'main.js': await readFile(scriptPath),
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
