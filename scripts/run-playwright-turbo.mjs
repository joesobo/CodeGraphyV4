#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function findPlaywrightPackages() {
  const packageDirs = readdirSync('packages', { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join('packages', entry.name));

  return packageDirs
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

const packageNames = findPlaywrightPackages();

if (packageNames.length === 0) {
  console.error('No workspace packages declare a test:playwright script.');
  process.exit(1);
}

const turboArgs = [
  'exec',
  'turbo',
  'run',
  'test:playwright',
  ...packageNames.map((packageName) => `--filter=${packageName}`),
  ...process.argv.slice(2),
];

const result = spawnSync('pnpm', turboArgs, {
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
