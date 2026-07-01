import { expect, test, type Frame } from '@playwright/test';
import fs from 'node:fs';
import {
  copyExampleWorkspace,
  createWorkspaceTempRoot,
} from '../acceptance/graphView/workspace';
import {
  launchVSCodeWithWorkspace,
  openGraphView,
  waitForGraphFrame,
} from '../acceptance/graphView/vscode';

const UNITY_ICON_ASSETS = [
  { label: '*.unity icon', extension: '.unity' },
  { label: '*.prefab icon', extension: '.prefab' },
  { label: '*.asset icon', extension: '.asset' },
  { label: '*.mat icon', extension: '.mat' },
  { label: '*.asmdef icon', extension: '.asmdef' },
  { label: '*.inputactions icon', extension: '.inputactions' },
];

test.describe('Unity plugin icons', () => {
  test('load in theme legends and graph nodes in an Extension Development Host', async () => {
    const workspaceTempRoot = createWorkspaceTempRoot();
    const workspacePath = copyExampleWorkspace(workspaceTempRoot, 'example-unity', {
      pluginPackages: ['@codegraphy-dev/plugin-unity'],
    });
    const vscode = await launchVSCodeWithWorkspace(workspacePath, {
      pluginPackageRelativePaths: ['packages/plugin-unity'],
    });

    try {
      await openGraphView(vscode.page);
      const frame = await waitForGraphFrame(vscode.page);
      await indexWorkspace(frame);
      await frame.getByTitle('Themes').click();

      for (const { label } of UNITY_ICON_ASSETS) {
        await expect.poll(() => hasLoadedUnityLegendIcon(frame, label), {
          message: `${label} loaded from Unity plugin assets`,
          timeout: 10_000,
        }).toBe(true);
        await expect(frame.getByTitle(label.replace(/ icon$/, ' icon unavailable'))).toHaveCount(0);
      }
      await expect(frame.getByTitle('*.asset shape: triangle')).toHaveCount(1);

      await expect.poll(() => readUnityFileNodeImageUrlsByExtension(frame), {
        message: 'Unity file node image URLs',
        timeout: 10_000,
      }).toEqual(expect.objectContaining(
        Object.fromEntries(UNITY_ICON_ASSETS
          .filter(({ extension }) => extension !== '.asmdef')
          .map(({ extension }) => [
            extension,
            expect.stringContaining('/packages/plugin-unity/assets/unity.svg'),
          ])),
      ));
    } finally {
      await vscode.app.close().catch(() => {});
      fs.rmSync(vscode.tempRoot, { recursive: true, force: true });
      fs.rmSync(workspaceTempRoot, { recursive: true, force: true });
    }
  });
});

async function hasLoadedUnityLegendIcon(frame: Frame, label: string): Promise<boolean> {
  return frame.getByAltText(label).evaluateAll((images, expectedAsset) =>
    images.some((image) => {
      const element = image as HTMLImageElement;
      return element.src.includes('/packages/plugin-unity/assets/')
        && element.src.includes(expectedAsset)
        && element.naturalWidth > 0;
    }),
  'unity.svg');
}

async function indexWorkspace(frame: Frame): Promise<void> {
  const indexButton = frame.getByRole('button', { name: 'Index Workspace' });
  if (await indexButton.count() === 0 || !(await indexButton.first().isVisible().catch(() => false))) {
    return;
  }

  await indexButton.click();
  await expect(
    frame.getByRole('progressbar', { name: 'Indexing progress' }),
  ).toBeHidden({ timeout: 30_000 });
}

async function readUnityFileNodeImageUrlsByExtension(frame: Frame): Promise<Record<string, string>> {
  return frame.evaluate(() => {
    const unityExtensions = ['.unity', '.prefab', '.asset', '.mat', '.inputactions'];
    const imageUrlsByExtension: Record<string, string> = {};
    for (const node of window.__CODEGRAPHY_GRAPH_DEBUG__?.getSnapshot().nodes ?? []) {
      const extension = unityExtensions.find(candidate => node.id.endsWith(candidate));
      if (extension && typeof node.imageUrl === 'string') {
        imageUrlsByExtension[extension] = node.imageUrl;
      }
    }
    return imageUrlsByExtension;
  });
}
