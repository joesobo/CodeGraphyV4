import { randomUUID } from 'node:crypto';
import {
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  mergePerfBaselineReports,
  parsePerfBaselineDocument,
} from './document';

export interface AdoptPerfBaselineReportsOptions {
  baselineDirectory: string;
  reportPaths: readonly string[];
}

export type PerfBaselineCommand =
  | {
      kind: 'adopt';
      reportPaths: string[];
    }
  | {
      documentPath: string;
      key: string;
      kind: 'has';
    };

function isMissingFile(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && error.code === 'ENOENT';
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8')) as unknown;
}

async function readOptionalJson(path: string): Promise<unknown> {
  try {
    return await readJson(path);
  } catch (error) {
    if (isMissingFile(error)) return undefined;
    throw error;
  }
}

async function writeBaselineDocument(
  outputPath: string,
  value: unknown,
): Promise<void> {
  const document = parsePerfBaselineDocument(value);
  const temporaryPath = join(
    dirname(outputPath),
    `.${basename(outputPath)}.${process.pid}.${randomUUID()}.tmp`,
  );
  await mkdir(dirname(outputPath), { recursive: true });
  try {
    await writeFile(
      temporaryPath,
      `${JSON.stringify(document, null, 2)}\n`,
      { encoding: 'utf8', flag: 'wx' },
    );
    await rename(temporaryPath, outputPath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

export function parsePerfBaselineCommandArguments(
  arguments_: readonly string[],
): PerfBaselineCommand {
  const normalizedArguments = arguments_[0] === '--'
    ? arguments_.slice(1)
    : arguments_;
  if (normalizedArguments[0] === '--has') {
    if (
      normalizedArguments.length !== 3
      || !normalizedArguments[1]?.trim()
      || !normalizedArguments[2]?.trim()
    ) {
      throw new Error('--has requires a baseline document path and report key');
    }
    return {
      documentPath: normalizedArguments[1],
      key: normalizedArguments[2],
      kind: 'has',
    };
  }
  if (normalizedArguments.length === 0) {
    throw new Error('At least one median performance report path is required');
  }
  return { kind: 'adopt', reportPaths: [...normalizedArguments] };
}

export async function hasPerfBaselineReport(
  documentPath: string,
  key: string,
): Promise<boolean> {
  const value = await readOptionalJson(documentPath);
  if (value === undefined) return false;
  const document = parsePerfBaselineDocument(value);
  return document.reports[key] !== undefined;
}

export async function adoptPerfBaselineReports(
  options: AdoptPerfBaselineReportsOptions,
): Promise<string> {
  const reportValues = await Promise.all(options.reportPaths.map(readJson));
  const initialDocument = mergePerfBaselineReports(undefined, reportValues);
  const baselineDirectory = resolve(options.baselineDirectory);
  const outputPath = resolve(
    baselineDirectory,
    `${initialDocument.runnerClass}.json`,
  );
  if (dirname(outputPath) !== baselineDirectory) {
    throw new Error(
      `Performance runner class ${initialDocument.runnerClass} resolves outside the baseline directory`,
    );
  }
  const existing = await readOptionalJson(outputPath);
  const document = mergePerfBaselineReports(existing, reportValues);
  await writeBaselineDocument(outputPath, document);
  return outputPath;
}

async function main(): Promise<void> {
  const command = parsePerfBaselineCommandArguments(process.argv.slice(2));
  if (command.kind === 'has') {
    if (!await hasPerfBaselineReport(command.documentPath, command.key)) {
      process.exitCode = 1;
    }
    return;
  }

  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const outputPath = await adoptPerfBaselineReports({
    baselineDirectory: join(repoRoot, 'perf', 'baselines'),
    reportPaths: command.reportPaths,
  });
  process.stdout.write(`${outputPath}\n`);
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
