import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { performance } from 'node:perf_hooks';
import * as vscode from 'vscode';

const extensionId = 'codegraphy.codegraphy';
const scenarioCommandId = 'codegraphy.perf.runScenario';

interface PerfScenarioResult {
  runId: string;
  scenario: 'cold-open' | 'warm-open';
  metrics: Array<{
    dimension?: string;
    metric:
      | 'coldOpenMs'
      | 'warmOpenMs'
      | 'incrementalRefreshMs'
      | 'payloadBytes'
      | 'watcherToGraphMs'
      | 'fileOpRoundtripMs'
      | 'layoutResets'
      | 'cacheSaveMs'
      | 'cacheBytes'
      | 'treeSitterParseMs'
      | 'graphBuildMs'
      | 'scopeToggleMs'
      | 'settleTimeMs'
      | 'idleCpuPct'
      | 'simTicksAfterSettle';
    operationId?: string;
    unit: 'ms' | 'bytes' | 'count' | 'fps' | 'percent';
    value: number;
  }>;
}

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required performance environment variable: ${name}`);
  }
  return value;
}

async function writeResultAtomically(resultPath: string, result: unknown): Promise<void> {
  await mkdir(dirname(resultPath), { recursive: true });
  const temporaryPath = join(
    dirname(resultPath),
    `.${basename(resultPath)}.${process.pid}.tmp`,
  );

  try {
    await writeFile(temporaryPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    await rename(temporaryPath, resultPath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

export async function run(): Promise<void> {
  const startedAt = performance.now();
  const fixture = requireEnvironmentVariable('CODEGRAPHY_PERF_FIXTURE');
  const resultPath = requireEnvironmentVariable('CODEGRAPHY_PERF_RESULT_PATH');
  const runId = requireEnvironmentVariable('CODEGRAPHY_PERF_RUN_ID');
  const scenario = requireEnvironmentVariable('CODEGRAPHY_PERF_SCENARIO');
  if (scenario !== 'cold-open' && scenario !== 'warm-open') {
    throw new Error(`Unsupported open performance scenario: ${scenario}`);
  }
  const extension = vscode.extensions.getExtension(extensionId);
  if (!extension) {
    throw new Error(`CodeGraphy extension ${extensionId} is not available`);
  }

  await extension.activate();
  const scenarioResult = await vscode.commands.executeCommand<PerfScenarioResult>(
    scenarioCommandId,
    { runId, scenario, startedAt },
  );
  if (!scenarioResult) {
    throw new Error(`Performance command ${scenarioCommandId} returned no result`);
  }

  await writeResultAtomically(resultPath, {
    schemaVersion: 1,
    fixture,
    ...scenarioResult,
  });
}
