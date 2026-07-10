import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { performance } from 'node:perf_hooks';
import * as vscode from 'vscode';
import {
  perfScenarioSchema,
} from '../../shared/perf/protocol';
import { perfScenarioResultSchema } from '../../extension/perf/result';
import { waitForIdleCpuDone } from './coordination';

const extensionId = 'codegraphy.codegraphy';
const scenarioCommandId = 'codegraphy.perf.runScenario';

interface PerfEditorLayoutDependencies {
  executeCommand(command: string): PromiseLike<unknown>;
  now(): number;
}

const defaultEditorLayoutDependencies: PerfEditorLayoutDependencies = {
  executeCommand: command => vscode.commands.executeCommand(command),
  now: () => performance.now(),
};

export async function preparePerfEditorLayout(
  dependencies: PerfEditorLayoutDependencies = defaultEditorLayoutDependencies,
): Promise<number> {
  await dependencies.executeCommand('workbench.action.files.newUntitledFile');
  return dependencies.now();
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
  const fixture = requireEnvironmentVariable('CODEGRAPHY_PERF_FIXTURE');
  const resultPath = requireEnvironmentVariable('CODEGRAPHY_PERF_RESULT_PATH');
  const runId = requireEnvironmentVariable('CODEGRAPHY_PERF_RUN_ID');
  const idleCpuReadyPath = process.env.CODEGRAPHY_PERF_IDLE_READY_PATH;
  const scenarioValue = requireEnvironmentVariable('CODEGRAPHY_PERF_SCENARIO');
  const parsedScenario = perfScenarioSchema.safeParse(scenarioValue);
  if (!parsedScenario.success) {
    throw new Error(`Unsupported performance scenario: ${scenarioValue}`);
  }
  const scenario = parsedScenario.data;
  const idleCpuDonePath = scenario === 'idle-watch'
    ? requireEnvironmentVariable('CODEGRAPHY_PERF_IDLE_DONE_PATH')
    : undefined;
  const startedAt = await preparePerfEditorLayout();
  const extension = vscode.extensions.getExtension(extensionId);
  if (!extension) {
    throw new Error(`CodeGraphy extension ${extensionId} is not available`);
  }

  await extension.activate();
  const rawScenarioResult = await vscode.commands.executeCommand<unknown>(
    scenarioCommandId,
    {
      runId,
      scenario,
      dimension: fixture,
      startedAt,
      ...(idleCpuReadyPath ? { idleCpuReadyPath } : {}),
    },
  );
  if (!rawScenarioResult) {
    throw new Error(`Performance command ${scenarioCommandId} returned no result`);
  }
  const scenarioResult = perfScenarioResultSchema.parse(rawScenarioResult);

  await writeResultAtomically(resultPath, {
    schemaVersion: 1,
    fixture,
    ...scenarioResult,
  });
  if (idleCpuDonePath) {
    await waitForIdleCpuDone(idleCpuDonePath);
  }
}
