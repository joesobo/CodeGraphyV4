import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const NODE_RUNTIME_RANGE = '^22.14.0 || >=23.6.0';
const MANIFEST_PATHS = [
  'package.json',
  'apps/web/package.json',
  'examples/example-javascript/package.json',
  'examples/example-svelte/package.json',
  'examples/example-typescript/package.json',
  'examples/example-vue/package.json',
  'packages/core/package.json',
  'packages/extension/package.json',
  'packages/extension-plugin-api/package.json',
  'packages/extension/src/e2e/fixtures/package-graph-view-plugin/package.json',
  'packages/graph-renderer/package.json',
  'packages/plugin-api/package.json',
  'packages/plugin-godot/package.json',
  'packages/plugin-markdown/package.json',
  'packages/plugin-particles/package.json',
  'packages/plugin-svelte/package.json',
  'packages/plugin-typescript/package.json',
  'packages/plugin-unity/package.json',
  'packages/plugin-vue/package.json',
  'packages/tldraw/package.json',
];

function readManifest(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8'));
}

test('first-party manifests declare the Node-API 10 compatible runtime range', () => {
  for (const manifestPath of MANIFEST_PATHS) {
    const manifest = readManifest(manifestPath);
    assert.equal(manifest.engines?.node, NODE_RUNTIME_RANGE, manifestPath);
  }
});
