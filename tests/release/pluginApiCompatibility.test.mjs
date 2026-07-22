import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const PLUGIN_HOSTS = [
  {
    apiVersion: '^4.0.0',
    id: 'core',
    plugins: ['godot', 'markdown', 'svelte', 'typescript', 'unity', 'vue'],
  },
  {
    apiVersion: '^1.0.0',
    id: 'codegraphy.extension',
    plugins: ['particles'],
  },
];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8'));
}

test('bundled plugin manifests declare the current runtime API consistently', () => {
  for (const host of PLUGIN_HOSTS) {
    for (const plugin of host.plugins) {
      const packageRoot = `packages/plugin-${plugin}`;
      const manifest = readJson(`${packageRoot}/codegraphy.json`);
      const packageManifest = readJson(`${packageRoot}/package.json`);
      const packagePlugin = packageManifest.codegraphy?.plugins?.find(
        candidate => candidate.id === manifest.id,
      );

      assert.equal(
        manifest.apiVersion,
        host.apiVersion,
        `${plugin} ${host.id} runtime manifest`,
      );
      assert.equal(
        packagePlugin?.host,
        host.id,
        `${plugin} package host`,
      );
      assert.equal(
        packagePlugin?.apiVersion,
        host.apiVersion,
        `${plugin} ${host.id} package metadata`,
      );
      assert.equal(
        packagePlugin.apiVersion,
        manifest.apiVersion,
        `${plugin} metadata agreement`,
      );
    }
  }
});

test('bundled plugin runtime versions match their package versions', () => {
  for (const host of PLUGIN_HOSTS) {
    for (const plugin of host.plugins) {
      const packageRoot = `packages/plugin-${plugin}`;
      const manifest = readJson(`${packageRoot}/codegraphy.json`);
      const packageManifest = readJson(`${packageRoot}/package.json`);

      assert.equal(
        manifest.version,
        packageManifest.version,
        `${plugin} runtime and package versions`,
      );
    }
  }
});
