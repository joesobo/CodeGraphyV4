import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const builtPackageEntrypoints = [
  ['@codegraphy/plugin-csharp', 'packages/plugin-csharp/dist/plugin.js'],
  ['@codegraphy/plugin-godot', 'packages/plugin-godot/dist/plugin.js'],
  ['@codegraphy/plugin-markdown', 'packages/plugin-markdown/dist/plugin.js'],
  ['@codegraphy/plugin-python', 'packages/plugin-python/dist/plugin.js'],
  ['@codegraphy/plugin-typescript', 'packages/plugin-typescript/dist/plugin.js'],
  ['@codegraphy/core', 'packages/core/dist/index.js'],
];

test('built public packages are importable by Node ESM', async () => {
  for (const [packageName] of builtPackageEntrypoints) {
    execFileSync('pnpm', ['--filter', packageName, 'run', 'build'], {
      cwd: repoRoot,
      stdio: 'pipe',
    });
  }

  for (const [packageName, entrypoint] of builtPackageEntrypoints) {
    const imported = await import(pathToFileURL(path.join(repoRoot, entrypoint)).href);
    assert.ok(imported, `${packageName} should expose an importable built entrypoint`);
  }
});
