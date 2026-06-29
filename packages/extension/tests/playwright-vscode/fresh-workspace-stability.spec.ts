import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  cleanupVSCode,
  launchVSCodeWithWorkspace,
  openGraphView,
  waitForGraphFrame,
} from '../acceptance/graphView/vscode';
import {
  countVisibleGraphPixels,
  getGraphCounts,
  graphStage,
} from '../acceptance/graphView/canvas';

function createFreshTypescriptWorkspace(): string {
  const workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-fresh-sidebar-'));
  fs.mkdirSync(path.join(workspacePath, 'src'), { recursive: true });
  fs.writeFileSync(
    path.join(workspacePath, 'package.json'),
    `${JSON.stringify({ name: 'fresh-sidebar-workspace', private: true, type: 'module' }, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(workspacePath, 'src', 'index.ts'),
    "import { palette } from './palette';\nconsole.log(palette.primary);\n",
  );
  fs.writeFileSync(
    path.join(workspacePath, 'src', 'palette.ts'),
    "export const palette = { primary: '#60a5fa' };\n",
  );
  return workspacePath;
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

test.describe('Fresh workspace sidebar stability', () => {
  test('keeps file nodes visible after first no-cache sidebar open settles', async () => {
    const workspacePath = createFreshTypescriptWorkspace();
    const graphCachePath = path.join(workspacePath, '.codegraphy', 'graph.lbug');
    expect(fs.existsSync(graphCachePath)).toBe(false);

    const vscode = await launchVSCodeWithWorkspace(workspacePath);
    try {
      await openGraphView(vscode.page);
      const frame = await waitForGraphFrame(vscode.page);
      await expect(graphStage(frame)).toBeVisible();

      const samples: Array<{ nodes: number; edges: number; pixels: number }> = [];
      for (let index = 0; index < 16; index += 1) {
        await wait(250);
        const counts = await getGraphCounts(frame);
        samples.push({
          ...counts,
          pixels: await countVisibleGraphPixels(frame),
        });
      }

      const firstPositiveIndex = samples.findIndex(sample => sample.nodes > 0);
      expect(firstPositiveIndex, `Expected file nodes to appear. Samples: ${JSON.stringify(samples)}`).toBeGreaterThanOrEqual(0);
      const droppedSample = samples.slice(firstPositiveIndex + 1).find(sample => sample.nodes === 0);
      expect(droppedSample, `Expected file nodes to remain after appearing. Samples: ${JSON.stringify(samples)}`).toBeUndefined();
      expect(samples.at(-1)?.nodes ?? 0, `Expected settled file nodes. Samples: ${JSON.stringify(samples)}`).toBeGreaterThan(0);
      expect(samples.at(-1)?.pixels ?? 0, `Expected visible graph pixels. Samples: ${JSON.stringify(samples)}`).toBeGreaterThan(0);
      expect(fs.existsSync(graphCachePath)).toBe(false);
    } finally {
      await cleanupVSCode(vscode);
      fs.rmSync(workspacePath, { recursive: true, force: true });
    }
  });
});
