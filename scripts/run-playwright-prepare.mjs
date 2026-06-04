#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
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

function findPlaywrightPreparePackages() {
  return findWorkspacePackageDirs()
    .map((dir) => {
      const manifestPath = join(dir, 'package.json');
      if (!existsSync(manifestPath)) {
        return undefined;
      }

      const manifest = readJson(manifestPath);
      return manifest.scripts?.['prepare:playwright']
        ? manifest.name
        : undefined;
    })
    .filter(Boolean)
    .sort();
}

for (const packageName of findPlaywrightPreparePackages()) {
  const result = spawnSync('pnpm', ['--filter', packageName, 'run', 'prepare:playwright'], {
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
