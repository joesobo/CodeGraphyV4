/**
 * Mocha test suite loader.
 * Called by @vscode/test-electron after VS Code starts.
 */
import * as path from 'path';
import * as fs from 'fs';
import { createRequire } from 'module';
import { glob } from 'glob';
import type MochaConstructor from 'mocha';

const GRAPH_TEST_ORDER = [
  'graph.test.js',
  'graph/workspaceDiscovery.test.js',
  'graph/workspaceIndexing.test.js',
  'graph/workspaceStartup.test.js',
  'graph/workspaceCacheRebuild.test.js',
  'graph/workspaceCacheLifecycle.test.js',
  'graph/layout.test.js',
  'graph/messaging.test.js',
  'graph/depthActiveFile.test.js',
  'graph/depthSelection.test.js',
  'graph/depthNeighbor.test.js',
  'graph/depthClear.test.js',
] as const;

function graphTestPriority(file: string): number {
  const normalizedFile = file.split(path.sep).join('/');
  const graphIndex = GRAPH_TEST_ORDER.indexOf(
    normalizedFile as typeof GRAPH_TEST_ORDER[number],
  );
  return graphIndex < 0 ? GRAPH_TEST_ORDER.length : graphIndex;
}

function findRepoRoot(startDir: string): string {
  let currentDir = startDir;

  while (currentDir !== path.dirname(currentDir)) {
    if (fs.existsSync(path.join(currentDir, 'pnpm-workspace.yaml'))) {
      return currentDir;
    }

    currentDir = path.dirname(currentDir);
  }

  throw new Error(`Unable to locate repo root from ${startDir}`);
}

export async function run(): Promise<void> {
  const repoRoot = findRepoRoot(__dirname);
  const requireFromExtension = createRequire(
    path.join(repoRoot, 'packages/extension/package.json'),
  );
  const mochaModule = requireFromExtension('mocha') as
    | typeof MochaConstructor
    | { default: typeof MochaConstructor };
  const Mocha = 'default' in mochaModule ? mochaModule.default : mochaModule;
  const grep = process.env.CODEGRAPHY_E2E_GREP
    ?? (process.env.CODEGRAPHY_E2E_FULL === '1'
      ? undefined
      : 'extension activates without error|all commands are registered|manual graph indexing creates scenario edges');
  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
    timeout: 30_000,
    grep: grep ? new RegExp(grep) : undefined,
  });

  const testsRoot = path.resolve(__dirname, '.');
  const files = await glob('**/*.test.js', { cwd: testsRoot });
  const orderedFiles = [...files].sort((left, right) => {
    const priorityDelta = graphTestPriority(left) - graphTestPriority(right);
    return priorityDelta || left.localeCompare(right);
  });

  for (const file of orderedFiles) {
    mocha.addFile(path.resolve(testsRoot, file));
  }

  return new Promise((resolve, reject) => {
    mocha.run((failures) => {
      if (failures > 0) {
        reject(new Error(`${failures} test(s) failed`));
      } else {
        resolve();
      }
    });
  });
}
