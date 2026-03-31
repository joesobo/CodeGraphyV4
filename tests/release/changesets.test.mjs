import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('pending changesets only reference workspace packages', () => {
  const packagesDir = path.join(repoRoot, 'packages');
  const workspacePackages = new Set(
    readdirSync(packagesDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(packagesDir, entry.name, 'package.json'))
      .filter((packageJsonPath) => {
        try {
          readFileSync(packageJsonPath, 'utf8');
          return true;
        } catch {
          return false;
        }
      })
      .map((packageJsonPath) => JSON.parse(readFileSync(packageJsonPath, 'utf8')).name),
  );

  const changesetDir = path.join(repoRoot, '.changeset');
  const pendingChangesets = readdirSync(changesetDir)
    .filter((file) => file.endsWith('.md') && file !== 'README.md');

  for (const filename of pendingChangesets) {
    const contents = readFileSync(path.join(changesetDir, filename), 'utf8');
    const referencedPackages = Array.from(
      contents.matchAll(/"([^"\n]+)"\s*:/g),
      ([, packageName]) => packageName,
    );

    for (const packageName of referencedPackages) {
      assert.ok(
        workspacePackages.has(packageName),
        `changeset ${filename} references unknown workspace package ${packageName}`,
      );
    }
  }
});

test('root changelog stays aligned with the published extension version', () => {
  const packageJson = JSON.parse(
    readFileSync(path.join(repoRoot, 'package.json'), 'utf8'),
  );
  const changelog = readFileSync(path.join(repoRoot, 'CHANGELOG.md'), 'utf8');
  const topVersion = changelog.match(/^##\s+([0-9]+\.[0-9]+\.[0-9]+)/m)?.[1];

  assert.ok(topVersion, 'expected CHANGELOG.md to start with a version heading');
  assert.equal(
    topVersion,
    packageJson.version,
    'expected CHANGELOG.md top version to match package.json version',
  );
});
