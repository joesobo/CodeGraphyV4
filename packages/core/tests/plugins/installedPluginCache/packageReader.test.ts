import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  readPackageManifest,
  readRequiredPackageManifest,
} from '../../../src/plugins/installedPluginCache/packageReader';

async function createPackage(packageJson: Record<string, unknown>): Promise<string> {
  const packageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-package-reader-'));
  await fs.writeFile(path.join(packageRoot, 'package.json'), JSON.stringify(packageJson), 'utf-8');
  return packageRoot;
}

describe('plugins/installedPluginCache/packageReader', () => {
  it('reads optional package manifests and returns null for missing or non-plugin packages', async () => {
    const pluginRoot = await createPackage({
      name: '@codegraphy-dev/plugin-python',
      version: '1.2.3',
      codegraphy: {
        type: 'plugin',
        apiVersion: '^2.0.0',
      },
    });
    const nonPluginRoot = await createPackage({
      name: '@codegraphy-dev/not-a-plugin',
      version: '1.0.0',
    });

    await expect(readPackageManifest(pluginRoot)).resolves.toEqual({
      package: '@codegraphy-dev/plugin-python',
      version: '1.2.3',
      apiVersion: '^2.0.0',
      disclosures: [],
      packageRoot: pluginRoot,
    });
    await expect(readPackageManifest(nonPluginRoot)).resolves.toBeNull();
    await expect(readPackageManifest(path.join(pluginRoot, 'missing'))).resolves.toBeNull();
  });

  it('requires a matching CodeGraphy plugin package manifest', async () => {
    const pluginRoot = await createPackage({
      name: '@codegraphy-dev/plugin-python',
      version: '1.2.3',
      codegraphy: {
        type: 'plugin',
        apiVersion: '^2.0.0',
        disclosures: ['network'],
      },
    });
    const nonPluginRoot = await createPackage({
      name: '@codegraphy-dev/not-a-plugin',
      version: '1.0.0',
    });
    const mismatchedRoot = await createPackage({
      name: '@codegraphy-dev/plugin-ruby',
      version: '1.2.3',
      codegraphy: {
        type: 'plugin',
        apiVersion: '^2.0.0',
      },
    });

    await expect(readRequiredPackageManifest('@codegraphy-dev/plugin-python', pluginRoot)).resolves.toEqual({
      package: '@codegraphy-dev/plugin-python',
      version: '1.2.3',
      apiVersion: '^2.0.0',
      disclosures: ['network'],
      packageRoot: pluginRoot,
    });
    await expect(readRequiredPackageManifest('@codegraphy-dev/plugin-python', path.join(pluginRoot, 'missing')))
      .rejects.toThrow("Run `npm i -g @codegraphy-dev/plugin-python` first.");
    await expect(readRequiredPackageManifest('@codegraphy-dev/not-a-plugin', nonPluginRoot))
      .rejects.toThrow("Package '@codegraphy-dev/not-a-plugin' is not a CodeGraphy plugin.");
    await expect(readRequiredPackageManifest('@codegraphy-dev/plugin-python', mismatchedRoot))
      .rejects.toThrow("Package '@codegraphy-dev/plugin-python' resolved to CodeGraphy plugin '@codegraphy-dev/plugin-ruby'.");
  });
});
