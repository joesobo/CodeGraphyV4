import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

const fixtureWorkspacePath = path.resolve(__dirname, '../../../test-fixtures/workspace');

export interface PluginIntegrationWorkspace {
  workspacePath: string;
  cleanup(): Promise<void>;
}

export async function createPluginIntegrationWorkspace(): Promise<PluginIntegrationWorkspace> {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-plugin-integration-'));
  const workspacePath = path.join(tempRoot, 'workspace');
  await fs.cp(fixtureWorkspacePath, workspacePath, { recursive: true });

  return {
    workspacePath,
    cleanup: async () => {
      await fs.rm(tempRoot, { recursive: true, force: true });
    },
  };
}
