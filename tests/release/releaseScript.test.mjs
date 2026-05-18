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
    '@codegraphy/plugin-api',
    '@codegraphy/plugin-csharp',
    '@codegraphy/plugin-godot',
    '@codegraphy/plugin-markdown',
    '@codegraphy/plugin-python',
    '@codegraphy/plugin-typescript',
    '@codegraphy/core',
    '@codegraphy/mcp',
  ]);
});

test('all publish includes npm packages before the marketplace extension', () => {
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
    args.includes('@codegraphy/plugin-api'),
  );
  const markdownIndex = releaseArgs.findIndex((args) =>
    args.includes('@codegraphy/plugin-markdown'),
  );
  const corePackageIndex = releaseArgs.findIndex((args) =>
    args.includes('@codegraphy/core'),
  );
  const mcpIndex = releaseArgs.findIndex((args) =>
    args.includes('@codegraphy/mcp'),
  );
  const extensionIndex = releaseArgs.findIndex((args) =>
    args.join(' ') === 'run publish:vsce',
  );
  const typescriptIndex = releaseArgs.findIndex((args) =>
    args.includes('@codegraphy/plugin-typescript'),
  );

  assert.ok(pluginApiIndex >= 0, 'expected plugin API npm publish');
  assert.ok(markdownIndex >= 0, 'expected Markdown plugin npm publish');
  assert.ok(corePackageIndex >= 0, 'expected core npm publish');
  assert.ok(mcpIndex >= 0, 'expected MCP npm publish');
  assert.ok(extensionIndex >= 0, 'expected extension marketplace publish');
  assert.ok(typescriptIndex >= 0, 'expected TypeScript plugin npm publish');
  assert.ok(pluginApiIndex < corePackageIndex, 'expected plugin API to publish before core package');
  assert.ok(markdownIndex < corePackageIndex, 'expected Markdown to publish before core package');
  assert.ok(typescriptIndex < extensionIndex, 'expected plugin npm packages before extension marketplace publish');
  assert.ok(corePackageIndex < mcpIndex, 'expected core package to publish before MCP');
  assert.ok(mcpIndex < extensionIndex, 'expected npm packages before extension marketplace publish');
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
      args: ['--filter', '@codegraphy/mcp', 'run', 'build'],
      options: { cwd: repoRoot },
    },
    {
      command: 'pnpm',
      args: [
        '--filter',
        '@codegraphy/mcp',
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
  const [mcpTarget] = resolveReleaseTargets('mcp', repoRoot);

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
      args: ['view', `${mcpTarget.packageName}@${mcpTarget.version}`, 'version', '--json'],
      options: { cwd: repoRoot, stdio: 'pipe' },
    },
    {
      command: 'pnpm',
      args: ['--filter', '@codegraphy/mcp', 'run', 'build'],
      options: { cwd: repoRoot },
    },
    {
      command: 'pnpm',
      args: [
        '--filter',
        '@codegraphy/mcp',
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
  const [pluginApiTarget] = resolveReleaseTargets('plugin-api', repoRoot);

  runRelease('publish', 'plugin-api', repoRoot, (command, args, options = {}) => {
    calls.push({ command, args, options });
    return { status: 0 };
  });

  assert.deepEqual(calls, [
    {
      command: 'npm',
      args: [
        'view',
        `${pluginApiTarget.packageName}@${pluginApiTarget.version}`,
        'version',
        '--json',
      ],
      options: { cwd: repoRoot, stdio: 'pipe' },
    },
  ]);
});

test('target groups can release only npm packages', () => {
  const targets = resolveReleaseTargets('npm', repoRoot);

  assert.deepEqual(
    targets.map((target) => target.packageName),
    [
      '@codegraphy/plugin-api',
      '@codegraphy/plugin-csharp',
      '@codegraphy/plugin-godot',
      '@codegraphy/plugin-markdown',
      '@codegraphy/plugin-python',
      '@codegraphy/plugin-typescript',
      '@codegraphy/core',
      '@codegraphy/mcp',
    ],
  );
});

test('core target resolves to the npm core package and extension target resolves to the VSIX release', () => {
  assert.deepEqual(resolveReleaseTargets('core', repoRoot).map((target) => target.packageName), [
    '@codegraphy/core',
  ]);

  assert.deepEqual(resolveReleaseTargets('extension', repoRoot), [
    {
      id: 'extension',
      aliases: ['extension', 'vsix', 'marketplace', 'core-extension'],
      kind: 'extension',
    },
  ]);
});
