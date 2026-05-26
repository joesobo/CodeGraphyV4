#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const BASELINE_PATH = 'quality-baselines/organize/repo.json';
const BASELINE_VERSION = 1;

function usage() {
  return [
    'Usage:',
    '  pnpm run organize -- .',
    '  pnpm run organize -- --update-baseline',
    '  pnpm run organize -- --raw [target]',
    '',
    'Root organize is a regression gate backed by the quality-baselines/organize/repo.json baseline.',
    'Use --raw to see the full advisory report from @poleski/quality-tools.'
  ].join('\n');
}

function parseArgs(rawArgs) {
  const args = rawArgs.filter((arg) => arg !== '--');
  const help = args.includes('--help') || args.includes('-h');
  const raw = args.includes('--raw');
  const updateBaseline = args.includes('--update-baseline');
  const json = args.includes('--json');
  const passthroughArgs = args.filter((arg) => !['--help', '-h', '--raw', '--update-baseline'].includes(arg));
  const target = passthroughArgs.find((arg) => !arg.startsWith('--')) ?? '.';

  return { help, json, passthroughArgs, raw, target, updateBaseline };
}

function runQualityToolsOrganize(args) {
  const result = spawnSync('pnpm', ['exec', 'quality-tools', 'organize', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });

  if (result.status !== 0) {
    if (result.stdout) {
      process.stdout.write(result.stdout);
    }
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
    process.exit(result.status ?? 1);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  return result.stdout;
}

function normalizeTarget(target) {
  return target.replace(/\/+$/, '') || '.';
}

function isRootTarget(target) {
  return normalizeTarget(target) === '.';
}

function verdictFindings(metric) {
  const findings = [];

  if (metric.fileFanOutVerdict !== 'STABLE') {
    findings.push({
      type: 'verdict',
      path: metric.directoryPath,
      field: 'fileFanOut',
      verdict: metric.fileFanOutVerdict,
      value: metric.fileFanOut
    });
  }

  if (metric.folderFanOutVerdict !== 'STABLE') {
    findings.push({
      type: 'verdict',
      path: metric.directoryPath,
      field: 'folderFanOut',
      verdict: metric.folderFanOutVerdict,
      value: metric.folderFanOut
    });
  }

  if (metric.depthVerdict !== 'STABLE') {
    findings.push({
      type: 'verdict',
      path: metric.directoryPath,
      field: 'depth',
      verdict: metric.depthVerdict,
      value: metric.depth
    });
  }

  return findings;
}

function issueFindings(metric) {
  return metric.fileIssues.map((issue) => ({
    type: 'fileIssue',
    path: metric.directoryPath,
    kind: issue.kind,
    fileName: issue.fileName,
    detail: issue.detail
  }));
}

function clusterFindings(metric) {
  return metric.clusters.map((cluster) => ({
    type: 'cluster',
    path: metric.directoryPath,
    suggestedFolder: cluster.suggestedFolder,
    confidence: cluster.confidence,
    members: [...cluster.members].sort()
  }));
}

function findingIdentityKey(finding) {
  switch (finding.type) {
    case 'cluster':
      return [
        finding.type,
        finding.path,
        finding.suggestedFolder
      ].join('|');
    case 'fileIssue':
      return [
        finding.type,
        finding.path,
        finding.kind,
        finding.fileName
      ].join('|');
    case 'verdict':
      return [
        finding.type,
        finding.path,
        finding.field
      ].join('|');
    default:
      throw new Error(`Unknown organize finding type: ${finding.type}`);
  }
}

function findingSortKey(finding) {
  switch (finding.type) {
    case 'cluster':
      return [
        findingIdentityKey(finding),
        finding.confidence,
        finding.members.join(',')
      ].join('|');
    case 'verdict':
      return [
        findingIdentityKey(finding),
        finding.verdict,
        finding.value
      ].join('|');
    default:
      return findingIdentityKey(finding);
  }
}

function sortFindings(findings) {
  return [...findings].sort((left, right) => findingSortKey(left).localeCompare(findingSortKey(right)));
}

function extractFindings(metrics) {
  return sortFindings(metrics.flatMap((metric) => [
    ...verdictFindings(metric),
    ...issueFindings(metric),
    ...clusterFindings(metric)
  ]));
}

function readBaseline() {
  return JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
}

function writeBaseline(metrics, findings) {
  const baseline = {
    version: BASELINE_VERSION,
    target: '.',
    generatedBy: 'scripts/run-organize.mjs',
    directoryCount: metrics.length,
    findings
  };

  mkdirSync(dirname(BASELINE_PATH), { recursive: true });
  writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`);
}

function keyMap(findings) {
  return new Map(findings.map((finding) => [findingIdentityKey(finding), finding]));
}

function verdictRank(verdict) {
  return verdict === 'STABLE' ? 0 : verdict === 'WARNING' ? 1 : 2;
}

function isRegressed(current, baseline) {
  if (!baseline || current.type !== baseline.type) {
    return true;
  }

  if (current.type === 'verdict') {
    return verdictRank(current.verdict) > verdictRank(baseline.verdict) || current.value > baseline.value;
  }

  if (current.type === 'cluster') {
    const baselineMembers = new Set(baseline.members);
    return current.members.some((member) => !baselineMembers.has(member));
  }

  return false;
}

function diffFindings(currentFindings, baselineFindings) {
  const currentByKey = keyMap(currentFindings);
  const baselineByKey = keyMap(baselineFindings);
  const added = currentFindings
    .map((finding) => {
      const baseline = baselineByKey.get(findingIdentityKey(finding));
      return isRegressed(finding, baseline) ? { ...finding, baseline } : undefined;
    })
    .filter(Boolean);
  const resolved = baselineFindings.filter((finding) => !currentByKey.has(findingIdentityKey(finding)));

  return { added, resolved };
}

function findingSummary(finding) {
  switch (finding.type) {
    case 'cluster':
      return `${finding.path}: cluster ${finding.suggestedFolder}/ (${finding.members.length} files, ${finding.confidence})${finding.baseline ? `, was ${finding.baseline.members.length}` : ''}`;
    case 'fileIssue':
      return `${finding.path}/${finding.fileName}: ${finding.kind}`;
    case 'verdict':
      return `${finding.path}: ${finding.field} ${finding.verdict} (${finding.value})${finding.baseline ? `, was ${finding.baseline.verdict} (${finding.baseline.value})` : ''}`;
    default:
      return JSON.stringify(finding);
  }
}

function printFindings(title, findings, limit = 40) {
  if (findings.length === 0) {
    return;
  }

  console.error(title);
  for (const finding of findings.slice(0, limit)) {
    console.error(`- ${findingSummary(finding)}`);
  }

  if (findings.length > limit) {
    console.error(`- ... ${findings.length - limit} more`);
  }
}

function runBaselineGate({ json, updateBaseline }) {
  const output = runQualityToolsOrganize(['.', '--json']);
  const metrics = JSON.parse(output);
  const findings = extractFindings(metrics);

  if (updateBaseline) {
    writeBaseline(metrics, findings);
    console.log(`Organize baseline updated: ${BASELINE_PATH}`);
    console.log(`Tracked findings: ${findings.length}`);
    return;
  }

  const baseline = readBaseline();
  if (baseline.version !== BASELINE_VERSION || baseline.target !== '.') {
    throw new Error(`Unsupported organize baseline format in ${BASELINE_PATH}`);
  }

  const { added, resolved } = diffFindings(findings, baseline.findings);

  if (json) {
    console.log(JSON.stringify({
      directoryCount: metrics.length,
      baselineFindings: baseline.findings.length,
      currentFindings: findings.length,
      added,
      resolved
    }, null, 2));
    if (added.length === 0) {
      return;
    }
  }

  if (added.length > 0) {
    printFindings('New organize findings:', added);
    if (resolved.length > 0) {
      printFindings('Resolved baseline findings:', resolved, 10);
    }
    process.exitCode = 1;
    return;
  }

  const resolvedText = resolved.length > 0 ? `, ${resolved.length} resolved` : '';
  console.log(
    `Organize baseline clean: ${metrics.length} directories scanned, ` +
    `${findings.length} current findings accepted by baseline${resolvedText}.`
  );
}

function main() {
  const parsed = parseArgs(process.argv.slice(2));

  if (parsed.help) {
    console.log(usage());
    return;
  }

  if (parsed.raw || !isRootTarget(parsed.target)) {
    process.stdout.write(runQualityToolsOrganize(parsed.passthroughArgs));
    return;
  }

  runBaselineGate(parsed);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
