import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

interface ExtensionManifest {
  activationEvents?: string[];
  extensionDependencies?: string[];
}

const pluginPackages = [
  'plugin-typescript',
  'plugin-python',
  'plugin-csharp',
  'plugin-godot',
] as const;

function readManifest(packageName: typeof pluginPackages[number]): ExtensionManifest {
  const manifestPath = path.resolve(__dirname, `../../../../packages/${packageName}/package.json`);
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as ExtensionManifest;
}

describe('plugin extension activation events', () => {
  it.each(pluginPackages)('%s activates when the core graph is used', (packageName) => {
    const manifest = readManifest(packageName);

    expect(manifest.extensionDependencies).toContain('codegraphy.codegraphy');
    expect(manifest.activationEvents).toEqual(
      expect.arrayContaining([
        'onStartupFinished',
        'onCommand:codegraphy.open',
        'onView:codegraphy.graphView',
      ]),
    );
  });
});
