import { expect, test, type Frame } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  launchVSCodeWithWorkspace,
  openGraphView,
  waitForGraphFrame,
} from '../acceptance/graphView/vscode';
import { repoRoot } from '../acceptance/graphView/workspace';

interface RuntimeNodeVisual {
  baseOpacity?: number;
  color?: string;
  id: string;
}

const PYTHON_FILE_NODE_ID = 'example-python/src/main.py';

test.describe('gitignored node visuals', () => {
  test('gitignored Python file nodes are muted on warm startup from an existing graph cache', async () => {
    const workspacePath = createPythonRepoWorkspace();
    let vscode = await launchVSCodeWithWorkspace(workspacePath, {
      pluginPackageRelativePaths: ['packages/plugin-python'],
    });

    try {
      await openGraphView(vscode.page);
      let frame = await waitForGraphFrame(vscode.page);
      await indexWorkspace(frame);

      const before = await waitForRuntimeNodeVisual(frame, PYTHON_FILE_NODE_ID);
      expect(before.baseOpacity).toBe(1);

      await vscode.app.close().catch(() => {});
      fs.rmSync(vscode.tempRoot, { recursive: true, force: true });
      fs.appendFileSync(path.join(workspacePath, '.gitignore'), 'example-python/*\n');

      vscode = await launchVSCodeWithWorkspace(workspacePath, {
        pluginPackageRelativePaths: ['packages/plugin-python'],
      });
      await openGraphView(vscode.page);
      frame = await waitForGraphFrame(vscode.page);
      await indexWorkspace(frame);

      const after = await waitForRuntimeNodeVisual(
        frame,
        PYTHON_FILE_NODE_ID,
        (node) => node.color !== before.color && node.baseOpacity === 0.45,
      );

      expect(after.color).not.toBe(before.color);
      expect(after.baseOpacity).toBe(0.45);
    } finally {
      await vscode.app.close().catch(() => {});
      fs.rmSync(vscode.tempRoot, { recursive: true, force: true });
      fs.rmSync(workspacePath, { recursive: true, force: true });
    }
  });

  test('gitignored Python file nodes stay visible and redraw with muted runtime color', async () => {
    const workspacePath = createPythonRepoWorkspace();
    const vscode = await launchVSCodeWithWorkspace(workspacePath, {
      pluginPackageRelativePaths: ['packages/plugin-python'],
    });

    try {
      await openGraphView(vscode.page);
      const frame = await waitForGraphFrame(vscode.page);
      await indexWorkspace(frame);

      const before = await waitForRuntimeNodeVisual(frame, PYTHON_FILE_NODE_ID);
      expect(before.baseOpacity).toBe(1);

      appendGitignorePatternOnDisk(workspacePath, 'example-python/*');
      await expect(frame.getByRole('progressbar', { name: 'Indexing progress' }))
        .toBeHidden({ timeout: 30_000 });

      const after = await waitForRuntimeNodeVisual(
        frame,
        PYTHON_FILE_NODE_ID,
        (node) => node.color !== before.color && node.baseOpacity === 0.45,
      );

      expect(after.color).not.toBe(before.color);
      expect(after.baseOpacity).toBe(0.45);
    } finally {
      await vscode.app.close().catch(() => {});
      fs.rmSync(vscode.tempRoot, { recursive: true, force: true });
      fs.rmSync(workspacePath, { recursive: true, force: true });
    }
  });
});

function appendGitignorePatternOnDisk(workspacePath: string, pattern: string): void {
  fs.appendFileSync(path.join(workspacePath, '.gitignore'), `${pattern}\n`);
}

function createPythonRepoWorkspace(): string {
  const workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-gitignored-python-'));

  fs.cpSync(
    path.join(repoRoot(), 'examples', 'example-python'),
    path.join(workspacePath, 'example-python'),
    {
      recursive: true,
      filter: (source) => !source.includes(`${path.sep}.codegraphy${path.sep}graph.lbug`),
    },
  );
  fs.mkdirSync(path.join(workspacePath, '.codegraphy'), { recursive: true });
  fs.rmSync(path.join(workspacePath, 'example-python', '.gitignore'), { force: true });
  fs.writeFileSync(path.join(workspacePath, '.gitignore'), '');
  execFileSync('git', ['init', '-q'], { cwd: workspacePath });
  fs.writeFileSync(
    path.join(workspacePath, '.codegraphy', 'settings.json'),
    `${JSON.stringify({
      version: 1,
      maxFiles: 500,
      include: ['**/*'],
      respectGitignore: true,
      showOrphans: true,
      plugins: [
        { id: 'codegraphy.markdown', enabled: true },
        { id: 'codegraphy.python', enabled: true },
      ],
      nodeColors: {
        file: '#A1A1AA',
        folder: '#A1A1AA',
        package: '#F59E0B',
        symbol: '#7C3AED',
        'symbol:function': '#8B5CF6',
        'symbol:class': '#3B82F6',
        variable: '#14B8A6',
      },
      nodeVisibility: {
        file: true,
        folder: true,
        package: false,
        symbol: false,
        'symbol:function': true,
        'symbol:class': true,
        variable: false,
      },
      edgeVisibility: {
        import: true,
        reference: false,
        call: false,
        inherit: false,
        load: false,
        nests: false,
        contains: false,
      },
      filterPatterns: [],
      disabledCustomFilterPatterns: [],
      disabledPluginFilterPatterns: [],
      showLabels: true,
      nodeSizeMode: 'connections',
    }, null, 2)}\n`,
  );

  return workspacePath;
}

async function indexWorkspace(frame: Frame): Promise<void> {
  const indexButton = frame.getByRole('button', { name: 'Index Workspace' });
  if (await indexButton.count() === 0 || !(await indexButton.first().isVisible().catch(() => false))) {
    await expect.poll(async () => {
      const statsText = await frame.getByText(/nodes.*connections/i).first().textContent().catch(() => '');
      const match = /(\d+)\s+connections/i.exec(statsText ?? '');
      return match ? Number(match[1]) : 0;
    }, { timeout: 10_000 }).toBeGreaterThan(0);
    return;
  }

  await indexButton.click();
  await expect(
    frame.getByRole('progressbar', { name: 'Indexing progress' }),
  ).toBeHidden({ timeout: 30_000 });
}

async function waitForRuntimeNodeVisual(
  frame: Frame,
  nodeId: string,
  predicate: (node: RuntimeNodeVisual) => boolean = () => true,
): Promise<RuntimeNodeVisual> {
  let lastNode: RuntimeNodeVisual | null = null;

  await expect.poll(async () => {
    lastNode = await readRuntimeNodeVisual(frame, nodeId);
    return lastNode !== null && predicate(lastNode);
  }, {
    message: `runtime visual for ${nodeId}`,
    timeout: 30_000,
  }).toBe(true);

  if (!lastNode) {
    throw new Error(`Expected runtime node ${nodeId}`);
  }

  return lastNode;
}

async function readRuntimeNodeVisual(frame: Frame, nodeId: string): Promise<RuntimeNodeVisual | null> {
  return frame.evaluate((id) => {
    return window.__CODEGRAPHY_GRAPH_DEBUG__?.getSnapshot().nodes.find(node => node.id === id) ?? null;
  }, nodeId);
}
