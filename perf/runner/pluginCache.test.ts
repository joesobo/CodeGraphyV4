import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { writeLinkedPluginCache } from './pluginCache';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map(root =>
    rm(root, { recursive: true, force: true }),
  ));
});

describe('performance installed plugin cache', () => {
  it('links a source workspace plugin using its package and static descriptors', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cgp-plugin-cache-'));
    temporaryRoots.push(root);
    const homePath = join(root, 'home');
    const packageRoot = join(root, 'plugin-typescript');
    await mkdir(packageRoot, { recursive: true });
    await Promise.all([
      writeFile(join(packageRoot, 'package.json'), JSON.stringify({
        name: '@codegraphy-dev/plugin-typescript',
        version: '2.2.5',
        codegraphy: {
          type: 'plugin',
          apiVersion: '^2.0.0',
          disclosures: ['workspaceWrites', 'invalid-disclosure'],
          defaultOptions: { projectReferences: true },
        },
      })),
      writeFile(join(packageRoot, 'codegraphy.json'), JSON.stringify({
        id: 'codegraphy.typescript',
        name: 'TypeScript/JavaScript',
        supportedExtensions: ['.ts', '.tsx', 42, ''],
        updateImpact: {
          toggle: 'reanalyze-plugin-files',
          defaultSetting: 'reanalyze-plugin-files',
          settings: {
            projectReferences: 'requires-full-index',
            ignored: 'not-an-impact',
          },
        },
      })),
    ]);

    await writeLinkedPluginCache({ homePath, packageRoot });

    expect(JSON.parse(await readFile(
      join(homePath, '.codegraphy', 'plugins.json'),
      'utf8',
    ))).toEqual({
      version: 1,
      plugins: [{
        package: '@codegraphy-dev/plugin-typescript',
        version: '2.2.5',
        apiVersion: '^2.0.0',
        disclosures: ['workspaceWrites'],
        packageRoot,
        defaultOptions: { projectReferences: true },
        pluginId: 'codegraphy.typescript',
        pluginName: 'TypeScript/JavaScript',
        updateImpact: {
          toggle: 'reanalyze-plugin-files',
          defaultSetting: 'reanalyze-plugin-files',
          settings: { projectReferences: 'requires-full-index' },
        },
        supportedExtensions: ['.ts', '.tsx'],
      }],
    });
  });

  it('rejects a linked plugin that targets an incompatible API version', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cgp-plugin-cache-'));
    temporaryRoots.push(root);
    const homePath = join(root, 'home');
    const packageRoot = join(root, 'plugin-incompatible');
    await mkdir(packageRoot, { recursive: true });
    await Promise.all([
      writeFile(join(packageRoot, 'package.json'), JSON.stringify({
        name: '@codegraphy-dev/plugin-incompatible',
        version: '1.0.0',
        codegraphy: {
          type: 'plugin',
          apiVersion: '^999.0.0',
          disclosures: [],
        },
      })),
      writeFile(join(packageRoot, 'codegraphy.json'), JSON.stringify({
        id: 'codegraphy.incompatible',
        supportedExtensions: ['.invalid'],
      })),
    ]);

    await expect(writeLinkedPluginCache({ homePath, packageRoot }))
      .rejects.toThrow(`Package at '${packageRoot}' is not a CodeGraphy plugin.`);
    await expect(readFile(join(homePath, '.codegraphy', 'plugins.json'), 'utf8'))
      .rejects.toMatchObject({ code: 'ENOENT' });
  });
});
