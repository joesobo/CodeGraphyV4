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

test('Core publishes dependency-free Graph Scope defaults as a focused subpath', () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'packages', 'core', 'package.json'), 'utf8'),
  );

  assert.deepEqual(manifest.exports['./graph-scope'], {
    types: './dist/graphScope/defaults.d.ts',
    default: './dist/graphScope/defaults.js',
  });
  assert.deepEqual(manifest.typesVersions['*']['graph-scope'], [
    'dist/graphScope/defaults.d.ts',
  ]);
  assert.match(
    fs.readFileSync(path.join(repoRoot, 'packages', 'core', 'scripts', 'build.mjs'), 'utf8'),
    /src\/graphScope\/defaults\.ts/,
  );
});

test('Core publishes dependency-free file colors as a focused subpath', () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'packages', 'core', 'package.json'), 'utf8'),
  );

  assert.deepEqual(manifest.exports['./file-colors'], {
    types: './dist/fileColors.d.ts',
    default: './dist/fileColors.js',
  });
  assert.deepEqual(manifest.typesVersions['*']['file-colors'], [
    'dist/fileColors.d.ts',
  ]);
  assert.match(
    fs.readFileSync(path.join(repoRoot, 'packages', 'core', 'scripts', 'build.mjs'), 'utf8'),
    /src\/fileColors\.ts/,
  );
});
