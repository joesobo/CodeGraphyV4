import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const PLUGIN_API_RANGE = '^3.0.0';
const BUNDLED_PLUGINS = [
  'godot',
  'markdown',
  'particles',
  'svelte',
  'typescript',
  'unity',
  'vue',
];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8'));
}

test('bundled plugin manifests declare the current runtime API consistently', () => {
  for (const plugin of BUNDLED_PLUGINS) {
    const packageRoot = `packages/plugin-${plugin}`;
    const manifest = readJson(`${packageRoot}/codegraphy.json`);
    const packageManifest = readJson(`${packageRoot}/package.json`);

    assert.equal(manifest.apiVersion, PLUGIN_API_RANGE, `${plugin} runtime manifest`);
    assert.equal(packageManifest.codegraphy?.apiVersion, PLUGIN_API_RANGE, `${plugin} package metadata`);
    assert.equal(packageManifest.codegraphy.apiVersion, manifest.apiVersion, `${plugin} metadata agreement`);
  }
});
