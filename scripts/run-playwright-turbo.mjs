#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function readWorkspacePackagePatterns() {
  const workspaceConfig = readFileSync('pnpm-workspace.yaml', 'utf8');
  const patterns = [];
  let readingPackages = false;

  for (const line of workspaceConfig.split(/\r?\n/)) {
    if (line.trim() === 'packages:') {
      readingPackages = true;
      continue;
    }

    if (readingPackages && /^\S/.test(line)) {
      break;
    }

    const match = readingPackages
      ? line.match(/^\s*-\s*["']?([^"']+)["']?\s*$/)
      : null;
    if (match) {
      patterns.push(match[1]);
    }
  }

  return patterns;
}

function expandWorkspacePattern(pattern) {
  if (!pattern.endsWith('/*')) {
    return existsSync(pattern) ? [pattern] : [];
  }

  const parentDirectory = pattern.slice(0, -2);
  if (!existsSync(parentDirectory)) {
    return [];
  }

  return readdirSync(parentDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(parentDirectory, entry.name));
}

function findWorkspacePackageDirs() {
  return [...new Set(readWorkspacePackagePatterns().flatMap(expandWorkspacePattern))].sort();
}

function findPlaywrightPackages() {
  // A bare root `turbo run test:playwright` currently schedules placeholder
  // tasks for packages that do not own Playwright. Filter dynamically so new
  // Playwright-owning packages are picked up without hard-coding extension.
  return findWorkspacePackageDirs()
    .map((dir) => {
      const manifestPath = join(dir, 'package.json');
      if (!existsSync(manifestPath)) {
        return undefined;
      }

      const manifest = readJson(manifestPath);
      return manifest.scripts?.['test:playwright']
        ? manifest.name
        : undefined;
    })
    .filter(Boolean)
    .sort();
}

export function selectPlaywrightPackages({ packageNames, vscodeSuite }) {
  if (!vscodeSuite) {
    return packageNames;
  }

  return packageNames.filter((packageName) => packageName === '@codegraphy-dev/extension');
}

export function splitScriptArgs(args) {
  const delimiterIndex = args.indexOf('--');
  if (delimiterIndex === -1) {
    return {
      turboArgs: args,
      passthroughArgs: [],
    };
  }

  return {
    turboArgs: args.slice(0, delimiterIndex),
    passthroughArgs: args.slice(delimiterIndex + 1),
  };
}

export function buildTurboArgs({ packageNames, turboArgs, passthroughArgs }) {
  return [
    'exec',
    'turbo',
    'run',
    'test:playwright',
    ...packageNames.map((packageName) => `--filter=${packageName}`),
    ...turboArgs,
    ...(passthroughArgs.length > 0 ? ['--', ...passthroughArgs] : []),
  ];
}

function main() {
  const packageNames = selectPlaywrightPackages({
    packageNames: findPlaywrightPackages(),
    vscodeSuite: process.env.CODEGRAPHY_VSCODE_PLAYWRIGHT_SUITE,
  });
  const { turboArgs, passthroughArgs } = splitScriptArgs(process.argv.slice(2));

  if (packageNames.length === 0) {
    console.error('No workspace packages declare a test:playwright script.');
    process.exit(1);
  }

  const result = spawnSync('pnpm', buildTurboArgs({ packageNames, turboArgs, passthroughArgs }), {
    stdio: 'inherit',
  });

  process.exit(result.status ?? 1);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
