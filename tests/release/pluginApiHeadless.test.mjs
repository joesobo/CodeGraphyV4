import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const pluginApiRoot = path.join(repoRoot, 'packages', 'plugin-api');

function readPluginApiFile(relativePath) {
  return readFileSync(path.join(pluginApiRoot, relativePath), 'utf8');
}

function listFilesIfPresent(relativePath) {
  const absolutePath = path.join(pluginApiRoot, relativePath);
  if (!existsSync(absolutePath)) return [];
  return readdirSync(absolutePath, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);
}

test('plugin API package publishes explicit headless and webview plugin contracts', () => {
  const manifest = JSON.parse(readPluginApiFile('package.json'));

  assert.deepEqual(Object.keys(manifest.exports), [
    '.',
    './events',
    './plugin',
    './access',
    './data',
    './graph-view',
    './webview',
  ]);
  assert.deepEqual(listFilesIfPresent('src/webview'), []);

  const indexSource = readPluginApiFile('src/index.ts');
  const pluginSource = readPluginApiFile('src/plugin.ts');

  for (const forbidden of [
    'CodeGraphyAPI',
    'NodeDecoration',
    'EdgeDecoration',
    'IView',
    'ICommand',
    'IContextMenuItem',
    'IExporter',
    'IToolbarAction',
  ]) {
    assert.equal(indexSource.includes(forbidden), false, `index.ts should not expose ${forbidden}`);
    assert.equal(pluginSource.includes(forbidden), false, `plugin.ts should not expose ${forbidden}`);
  }
});
