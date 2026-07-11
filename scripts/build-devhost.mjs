#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), '..');
const cliPath = path.join(repoRoot, 'packages/core/dist/cli/main.js');
const dryRun = process.argv.includes('--dry-run');
const jsonOutput = process.argv.includes('--json');
const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

const publicPluginPackageRoots = [
  path.join(repoRoot, 'packages/plugin-typescript'),
  path.join(repoRoot, 'packages/plugin-unity'),
  path.join(repoRoot, 'packages/plugin-godot'),
  path.join(repoRoot, 'packages/plugin-particles'),
  path.join(repoRoot, 'packages/plugin-material-icons'),
  path.join(repoRoot, 'packages/plugin-vue'),
  path.join(repoRoot, 'packages/plugin-svelte'),
];

const buildFilters = [
  '@codegraphy-dev/extension...',
  '@codegraphy-dev/plugin-typescript...',
  '@codegraphy-dev/plugin-unity...',
  '@codegraphy-dev/plugin-godot...',
  '@codegraphy-dev/plugin-particles...',
  '@codegraphy-dev/plugin-material-icons...',
  '@codegraphy-dev/plugin-vue...',
  '@codegraphy-dev/plugin-svelte...',
];

function packageJsonPath(packageRoot) {
  return path.join(packageRoot, 'package.json');
}

function isCodeGraphyPluginPackage(packageRoot) {
  try {
    const manifest = JSON.parse(fs.readFileSync(packageJsonPath(packageRoot), 'utf8'));
    return manifest?.codegraphy?.type === 'plugin';
  } catch {
    return false;
  }
}

function uniqueExistingPluginPackageRoots(packageRoots) {
  const seen = new Set();
  const roots = [];

  for (const packageRoot of packageRoots) {
    const resolvedRoot = path.resolve(packageRoot);
    if (seen.has(resolvedRoot) || !isCodeGraphyPluginPackage(resolvedRoot)) {
      continue;
    }
    seen.add(resolvedRoot);
    roots.push(resolvedRoot);
  }

  return roots;
}

function getPrivatePluginPackageRoots() {
  const packageRoots = [];
  if (process.env.CODEGRAPHY_ORGANIZE_PLUGIN_ROOT) {
    packageRoots.push(process.env.CODEGRAPHY_ORGANIZE_PLUGIN_ROOT);
  }
  if (process.env.CODEGRAPHY_PRO_PLUGINS_REPO) {
    packageRoots.push(path.join(process.env.CODEGRAPHY_PRO_PLUGINS_REPO, 'packages/organization'));
  }

  packageRoots.push(
    path.join(repoRoot, '..', 'codegraphy-pro-plugins-organization', 'packages/organization'),
    path.join(repoRoot, '..', 'codegraphy-pro-plugins', 'packages/organization'),
    path.join(os.homedir(), 'Desktop/Projects/codegraphy-pro-plugins-organization/packages/organization'),
    path.join(os.homedir(), 'Desktop/Projects/codegraphy-pro-plugins/packages/organization'),
  );

  return uniqueExistingPluginPackageRoots(packageRoots);
}

const privatePluginBuildRoots = getPrivatePluginPackageRoots();
const linkPackageRoots = uniqueExistingPluginPackageRoots([
  ...publicPluginPackageRoots,
  ...privatePluginBuildRoots,
]);

const plan = {
  repoRoot,
  buildFilters,
  privatePluginBuildRoots,
  linkPackageRoots,
  commands: [
    {
      command: pnpmCommand,
      args: [
        'exec',
        'turbo',
        'run',
        'build',
        ...buildFilters.map(filter => `--filter=${filter}`),
      ],
      cwd: repoRoot,
    },
    ...privatePluginBuildRoots.map(packageRoot => ({
      command: pnpmCommand,
      args: ['--dir', packageRoot, 'run', 'build'],
      cwd: repoRoot,
    })),
    ...linkPackageRoots.map(packageRoot => ({
      command: process.execPath,
      args: [cliPath, 'plugins', 'link', packageRoot],
      cwd: repoRoot,
    })),
  ],
};

function runCommand(command) {
  console.log(`$ ${command.command} ${command.args.join(' ')}`);
  const result = spawnSync(command.command, command.args, {
    cwd: command.cwd,
    env: process.env,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (dryRun) {
  if (jsonOutput) {
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
  } else {
    for (const command of plan.commands) {
      process.stdout.write(`${command.command} ${command.args.join(' ')}\n`);
    }
  }
} else {
  for (const command of plan.commands) {
    runCommand(command);
  }
}
