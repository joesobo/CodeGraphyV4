import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { collectReleaseTargets } from '../../scripts/release.mjs';

const repoRoot = process.cwd();

test('release discovery ignores workspace directories without package metadata', () => {
  const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-release-targets-'));
  fs.mkdirSync(path.join(repoDir, 'packages', 'core'), { recursive: true });
  fs.mkdirSync(path.join(repoDir, 'packages', 'removed-package', 'node_modules'), { recursive: true });
  fs.writeFileSync(
    path.join(repoDir, 'package.json'),
    JSON.stringify({ workspaces: ['packages/*'] }),
  );
  fs.writeFileSync(
    path.join(repoDir, 'packages', 'core', 'package.json'),
    JSON.stringify({
      name: '@codegraphy-dev/core',
      version: '2.1.0',
      publishConfig: { access: 'public' },
    }),
  );

  assert.deepEqual(
    collectReleaseTargets(repoDir).map(target => target.id),
    ['core', 'extension'],
  );
});

test('release workflow exposes separate core package and extension targets', () => {
  const workflow = fs.readFileSync(
    path.join(repoRoot, '.github', 'workflows', 'release.yml'),
    'utf8',
  );

  assert.match(workflow, /^\s+- core$/m);
  assert.match(workflow, /^\s+- extension$/m);
});

test('release workflow exposes every discovered release target', () => {
  const workflow = fs.readFileSync(
    path.join(repoRoot, '.github', 'workflows', 'release.yml'),
    'utf8',
  );
  const options = Array.from(
    workflow
      .slice(workflow.indexOf('        options:'), workflow.indexOf('\n\npermissions:'))
      .matchAll(/^\s+- (.+)$/gm),
    match => match[1],
  );

  for (const target of collectReleaseTargets(repoRoot)) {
    assert.equal(
      options.some(option => option === target.id || target.aliases?.includes(option)),
      true,
      `Missing workflow option for ${target.id}`,
    );
  }
});

test('release workflow routes core through npm and extension through VSIX publishing', () => {
  const workflow = fs.readFileSync(
    path.join(repoRoot, '.github', 'workflows', 'release.yml'),
    'utf8',
  );

  assert.match(
    workflow,
    /release-npm:\n\s+if: \$\{\{ inputs\.target != 'vsce' && inputs\.target != 'extension' \}\}/,
  );
  const vsixJob = workflow.slice(workflow.indexOf('  release-vsix:'));
  assert.match(vsixJob, /inputs\.target == 'extension'/);
  assert.doesNotMatch(vsixJob, /inputs\.target == 'core'/);
});

test('all releases finish npm publishing before Marketplace publishing', () => {
  const workflow = fs.readFileSync(
    path.join(repoRoot, '.github', 'workflows', 'release.yml'),
    'utf8',
  );

  assert.match(
    workflow,
    /release-vsix:\n\s+needs: release-npm\n\s+if: \$\{\{ always\(\)/,
  );
  assert.match(workflow, /needs\.release-npm\.result == 'success'/);
  assert.match(workflow, /needs\.release-npm\.result == 'skipped'/);
});
