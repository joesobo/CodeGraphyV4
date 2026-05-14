import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const languagePluginPackages = [
  {
    dir: 'plugin-typescript',
    packageName: '@codegraphy/plugin-typescript',
  },
  {
    dir: 'plugin-python',
    packageName: '@codegraphy/plugin-python',
  },
  {
    dir: 'plugin-csharp',
    packageName: '@codegraphy/plugin-csharp',
  },
  {
    dir: 'plugin-godot',
    packageName: '@codegraphy/plugin-godot',
  },
];

function readPackageManifest(packageDir) {
  return JSON.parse(
    readFileSync(path.join(repoRoot, 'packages', packageDir, 'package.json'), 'utf8'),
  );
}

test('first-party language plugins are headless CodeGraphy npm plugin packages', () => {
  for (const { dir, packageName } of languagePluginPackages) {
    const manifest = readPackageManifest(dir);

    assert.equal(manifest.name, packageName);
    assert.equal(manifest.type, 'module');
    assert.equal(manifest.main, './dist/plugin.js');
    assert.equal(manifest.types, './dist/plugin.d.ts');
    assert.equal(manifest.exports['.'].default, './dist/plugin.js');
    assert.equal(manifest.exports['.'].types, './dist/plugin.d.ts');
    assert.equal(manifest.publishConfig.access, 'public');
    assert.equal(manifest.codegraphy.type, 'plugin');
    assert.equal(manifest.codegraphy.apiVersion, '^2.0.0');
    assert.deepEqual(manifest.codegraphy.disclosures, []);
    assert.ok(!('activationEvents' in manifest), `${packageName} should not activate as a VS Code extension`);
    assert.ok(!('extensionDependencies' in manifest), `${packageName} should not depend on VS Code extensions`);
    assert.ok(!('categories' in manifest), `${packageName} should not publish as a marketplace category`);
    assert.ok(!('package:vsix' in manifest.scripts), `${packageName} should not create a VSIX`);
    assert.ok(!('publish:vsce' in manifest.scripts), `${packageName} should not publish through VSCE`);
  }
});
