#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.resolve(process.argv[2] ?? path.join(repoRoot, 'reports/quality-tools/crap/repo'));

const packages = [
  { name: 'core', directory: 'packages/core', config: 'vitest.config.ts' },
  {
    name: 'extension',
    directory: 'packages/extension',
    config: 'vitest.config.ts',
    extraArgs: ['--testTimeout', '60000', '--silent'],
  },
  { name: 'mcp', directory: 'packages/mcp', config: 'vitest.config.ts' },
  { name: 'plugin-csharp', directory: 'packages/plugin-csharp' },
  { name: 'plugin-godot', directory: 'packages/plugin-godot' },
  { name: 'plugin-markdown', directory: 'packages/plugin-markdown' },
  { name: 'plugin-particles', directory: 'packages/plugin-particles' },
  { name: 'plugin-python', directory: 'packages/plugin-python' },
  { name: 'plugin-svelte', directory: 'packages/plugin-svelte' },
  { name: 'plugin-typescript', directory: 'packages/plugin-typescript' },
];

function runPackageCoverage(packageConfig) {
  const packageRoot = path.join(repoRoot, packageConfig.directory);
  const reportDir = path.join(outputDir, packageConfig.name);
  fs.mkdirSync(reportDir, { recursive: true });

  const args = ['exec', 'vitest', 'run'];
  if (packageConfig.config) {
    args.push('--config', packageConfig.config);
  }
  args.push(
    '--coverage',
    '--coverage.provider',
    'istanbul',
    '--coverage.reportsDirectory',
    reportDir,
    ...(packageConfig.extraArgs ?? []),
  );

  const result = spawnSync('pnpm', args, {
    cwd: packageRoot,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  return path.join(reportDir, 'coverage-final.json');
}

const coverageReports = packages.map(runPackageCoverage);
const mergedCoverage = {};
for (const coverageReportPath of coverageReports) {
  Object.assign(
    mergedCoverage,
    JSON.parse(fs.readFileSync(coverageReportPath, 'utf-8')),
  );
}

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(
  path.join(outputDir, 'coverage-final.json'),
  `${JSON.stringify(mergedCoverage)}\n`,
);
