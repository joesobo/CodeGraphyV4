import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const repoRoot = process.cwd();

test('Core build removes stale package output before compiling', async () => {
  const { cleanCoreBuildOutput } = await import('../../packages/core/scripts/clean.mjs');
  const packageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-core-clean-'));
  const staleFile = path.join(packageDir, 'dist', 'removed-module.js');
  fs.mkdirSync(path.dirname(staleFile), { recursive: true });
  fs.writeFileSync(staleFile, 'stale');

  cleanCoreBuildOutput(packageDir);

  assert.equal(fs.existsSync(staleFile), false);
});

test('Core package runs the clean step before compilation', () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'packages', 'core', 'package.json'), 'utf8'),
  );

  assert.match(manifest.scripts.build, /^node \.\/scripts\/clean\.mjs && tsc /);
});

test('Core package declares the Node range supported by its native dependencies', () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'packages', 'core', 'package.json'), 'utf8'),
  );

  assert.equal(manifest.engines.node, '>=20 <23');
});
