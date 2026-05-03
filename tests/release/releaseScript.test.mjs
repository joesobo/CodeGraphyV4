import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  collectReleaseTargets,
  resolveReleaseTargets,
  runRelease,
} from '../../scripts/release.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('release targets include every public workspace package', () => {
  const targets = collectReleaseTargets(repoRoot);
  const packageNames = targets
    .filter((target) => target.packageName)
    .map((target) => target.packageName);

  assert.deepEqual(packageNames, [
    '@codegraphy-vscode/plugin-api',
    '@codegraphy-vscode/mcp',
    'codegraphy-csharp',
    'codegraphy-godot',
    'codegraphy-python',
    'codegraphy-typescript',
  ]);
});

test('all publish includes npm packages before marketplace packages', () => {
  const calls = [];

  runRelease('publish', 'all', repoRoot, (command, args, options = {}) => {
    calls.push({ command, args, options });

    if (command === 'npm' && args[0] === 'view') {
      return { status: 1 };
    }

    return { status: 0 };
  });

  const releaseCalls = calls.filter((call) => call.command === 'pnpm');
  const releaseArgs = releaseCalls.map((call) => call.args);

  const pluginApiIndex = releaseArgs.findIndex((args) =>
    args.includes('@codegraphy-vscode/plugin-api'),
  );
  const mcpIndex = releaseArgs.findIndex((args) =>
    args.includes('@codegraphy-vscode/mcp'),
  );
  const coreIndex = releaseArgs.findIndex((args) =>
    args.join(' ') === 'run publish:vsce',
  );
  const typescriptIndex = releaseArgs.findIndex((args) =>
    args.includes('codegraphy-typescript'),
  );

  assert.ok(pluginApiIndex >= 0, 'expected plugin API npm publish');
  assert.ok(mcpIndex >= 0, 'expected MCP npm publish');
  assert.ok(coreIndex >= 0, 'expected core marketplace publish');
  assert.ok(typescriptIndex >= 0, 'expected TypeScript marketplace publish');
  assert.ok(pluginApiIndex < mcpIndex, 'expected plugin API to publish before MCP');
  assert.ok(mcpIndex < coreIndex, 'expected npm packages before core marketplace publish');
  assert.ok(coreIndex < typescriptIndex, 'expected core before plugin marketplace publishes');
});

test('npm package release creates a tarball artifact', () => {
  const calls = [];

  runRelease('package', 'mcp', repoRoot, (command, args, options = {}) => {
    calls.push({ command, args, options });
    return { status: 0 };
  });

  assert.deepEqual(calls, [
    {
      command: 'pnpm',
      args: ['--filter', '@codegraphy-vscode/mcp', 'run', 'build'],
      options: { cwd: repoRoot },
    },
    {
      command: 'pnpm',
      args: [
        '--filter',
        '@codegraphy-vscode/mcp',
        'pack',
        '--pack-destination',
        path.join(repoRoot, 'artifacts', 'npm'),
      ],
      options: { cwd: repoRoot },
    },
  ]);
});

test('npm package publish builds before publishing', () => {
  const calls = [];

  runRelease('publish', 'mcp', repoRoot, (command, args, options = {}) => {
    calls.push({ command, args, options });

    if (command === 'npm' && args[0] === 'view') {
      return { status: 1 };
    }

    return { status: 0 };
  });

  assert.deepEqual(calls, [
    {
      command: 'npm',
      args: ['view', '@codegraphy-vscode/mcp@1.0.1', 'version', '--json'],
      options: { cwd: repoRoot, stdio: 'pipe' },
    },
    {
      command: 'pnpm',
      args: ['--filter', '@codegraphy-vscode/mcp', 'run', 'build'],
      options: { cwd: repoRoot },
    },
    {
      command: 'pnpm',
      args: [
        '--filter',
        '@codegraphy-vscode/mcp',
        'publish',
        '--access',
        'public',
        '--no-git-checks',
      ],
      options: { cwd: repoRoot },
    },
  ]);
});

test('npm publish skips package versions already on npm', () => {
  const calls = [];

  runRelease('publish', 'plugin-api', repoRoot, (command, args, options = {}) => {
    calls.push({ command, args, options });
    return { status: 0 };
  });

  assert.deepEqual(calls, [
    {
      command: 'npm',
      args: ['view', '@codegraphy-vscode/plugin-api@1.2.0', 'version', '--json'],
      options: { cwd: repoRoot, stdio: 'pipe' },
    },
  ]);
});

test('target groups can release only npm packages', () => {
  const targets = resolveReleaseTargets('npm', repoRoot);

  assert.deepEqual(
    targets.map((target) => target.packageName),
    ['@codegraphy-vscode/plugin-api', '@codegraphy-vscode/mcp'],
  );
});
