#!/usr/bin/env node

import { appendFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function findPlaywrightTasks(dryRun) {
  return dryRun.tasks
    .filter((entry) => entry.task === 'test:playwright')
    .sort((left, right) => left.taskId.localeCompare(right.taskId));
}

export function computePlaywrightTurboCacheHash(dryRun) {
  const tasks = findPlaywrightTasks(dryRun);

  if (tasks.length === 0) {
    throw new Error('No test:playwright task found in Turbo dry run output.');
  }

  for (const task of tasks) {
    if (!task.hash) {
      throw new Error(`Turbo dry run task ${task.taskId} did not include a hash.`);
    }
  }

  if (tasks.length === 1) {
    return tasks[0].hash;
  }

  return createHash('sha256')
    .update(tasks.map((task) => `${task.taskId}:${task.hash}`).join('\n'))
    .digest('hex')
    .slice(0, 32);
}

export function arePlaywrightTasksCached(dryRun) {
  const tasks = findPlaywrightTasks(dryRun);

  if (tasks.length === 0) {
    throw new Error('No test:playwright task found in Turbo dry run output.');
  }

  return tasks.every((task) => {
    const cache = task.cache ?? {};
    return cache.local === true || cache.remote === true || cache.status === 'HIT';
  });
}

function writeGithubOutput(values) {
  const output = Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n') + '\n';

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, output);
    return;
  }

  process.stdout.write(output);
}

function main() {
  const [command, dryRunPath = 'turbo-playwright-dry-run.json'] = process.argv.slice(2);
  const dryRun = readJson(dryRunPath);

  if (command === 'key') {
    writeGithubOutput({ hash: computePlaywrightTurboCacheHash(dryRun) });
    return;
  }

  if (command === 'status') {
    writeGithubOutput({ cached: String(arePlaywrightTasksCached(dryRun)) });
    return;
  }

  console.error('Usage: node scripts/playwright-turbo-cache.mjs <key|status> [dry-run-json]');
  process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
