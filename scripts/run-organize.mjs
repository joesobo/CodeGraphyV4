#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rootBaselinePath = path.join(repoRoot, 'docs/quality/baselines/organize-repo.json');

if (shouldUseRootBaseline(args)) {
  runRootBaselineCheck();
} else {
  const result = runQualityTools(args, { stdio: 'inherit' });
  process.exit(result.status ?? 1);
}

function shouldUseRootBaseline(runArgs) {
  if (!fs.existsSync(rootBaselinePath)) {
    return false;
  }

  const explicitControlFlag = runArgs.some((arg) => (
    arg === '--compare'
    || arg === '--json'
    || arg === '--verbose'
    || arg === '--write-baseline'
  ));
  if (explicitControlFlag) {
    return false;
  }

  const positionalArgs = runArgs.filter((arg) => !arg.startsWith('--'));
  return positionalArgs.length === 0 || (positionalArgs.length === 1 && positionalArgs[0] === '.');
}

function runRootBaselineCheck() {
  const result = runQualityTools(
    ['.', '--json', '--compare', rootBaselinePath],
    { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] },
  );

  if (result.status !== 0) {
    process.stderr.write(result.stderr ?? '');
    process.exit(result.status ?? 1);
  }

  const metrics = JSON.parse(result.stdout);
  const findings = metrics.filter(isNewOrWorseFinding);
  if (findings.length === 0) {
    console.log('Organize clean: no new or worsened findings against docs/quality/baselines/organize-repo.json.');
    return;
  }

  console.log('Organize findings changed against docs/quality/baselines/organize-repo.json:');
  for (const finding of findings) {
    console.log(formatFinding(finding));
  }
}

function isNewOrWorseFinding(metric) {
  if (!shouldShowDirectory(metric)) {
    return false;
  }

  const comparison = metric.comparison;
  if (!comparison) {
    return true;
  }

  return [
    comparison.fileFanOutDelta,
    comparison.folderFanOutDelta,
    comparison.clusterCountDelta,
    comparison.issueCountDelta,
    comparison.redundancyDelta,
  ].some((delta) => delta > 0);
}

function shouldShowDirectory(metric) {
  if (metric.fileIssues.length > 0) {
    return true;
  }

  return metric.fileFanOutVerdict !== 'STABLE'
    || metric.folderFanOutVerdict !== 'STABLE'
    || metric.depthVerdict !== 'STABLE';
}

function formatFinding(metric) {
  if (!metric.comparison) {
    return `${metric.directoryPath} [new] files=${metric.fileFanOut} folders=${metric.folderFanOut} clusters=${metric.clusters.length} issues=${metric.fileIssues.length}`;
  }

  const comparison = metric.comparison;
  return [
    `${metric.directoryPath} [${comparison.verdict}]`,
    `filesDelta=${comparison.fileFanOutDelta}`,
    `foldersDelta=${comparison.folderFanOutDelta}`,
    `clustersDelta=${comparison.clusterCountDelta}`,
    `issuesDelta=${comparison.issueCountDelta}`,
    `redundancyDelta=${comparison.redundancyDelta}`,
  ].join(' ');
}

function runQualityTools(organizeArgs, options) {
  return spawnSync('pnpm', ['--silent', 'exec', 'quality-tools', 'organize', ...organizeArgs], {
    cwd: repoRoot,
    ...options,
  });
}
