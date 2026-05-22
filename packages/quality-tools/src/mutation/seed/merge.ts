import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'fs';
import { basename, dirname, join, relative } from 'path';

interface MutationSeedTest {
  id: string;
  [key: string]: unknown;
}

interface MutationSeedTestFile {
  source?: string;
  tests: MutationSeedTest[];
  [key: string]: unknown;
}

interface MutationSeedMutant {
  coveredBy?: string[];
  killedBy?: string[];
  [key: string]: unknown;
}

interface MutationSeedSourceFile {
  mutants: MutationSeedMutant[];
  [key: string]: unknown;
}

export interface MutationSeedReport {
  config?: unknown;
  files: Record<string, MutationSeedSourceFile>;
  framework?: unknown;
  projectRoot?: string;
  schemaVersion?: string;
  testFiles: Record<string, MutationSeedTestFile>;
  thresholds?: unknown;
  [key: string]: unknown;
}

export interface WriteMutationSeedReportsOptions {
  inputRoot: string;
  outputRoot: string;
  sha: string;
}

function parseMutationSeedReport(report: unknown): MutationSeedReport {
  if (!report || typeof report !== 'object') {
    throw new Error('Mutation seed report must be an object.');
  }

  const candidate = report as Partial<MutationSeedReport>;
  if (!candidate.files || typeof candidate.files !== 'object') {
    throw new Error('Mutation seed report is missing a files object.');
  }

  return {
    ...candidate,
    files: candidate.files,
    testFiles: candidate.testFiles ?? {},
  };
}

function rewriteTestIds(
  testFiles: Record<string, MutationSeedTestFile>,
  nextTestId: { value: number },
): {
  mappedTestFiles: Record<string, MutationSeedTestFile>;
  testIdMap: Map<string, string>;
} {
  const testIdMap = new Map<string, string>();
  const mappedTestFiles: Record<string, MutationSeedTestFile> = {};

  for (const [fileName, testFile] of Object.entries(testFiles)) {
    mappedTestFiles[fileName] = {
      ...testFile,
      tests: testFile.tests.map((test) => {
        const oldId = String(test.id);
        const newId = String(nextTestId.value++);
        testIdMap.set(oldId, newId);
        return { ...test, id: newId };
      }),
    };
  }

  return { mappedTestFiles, testIdMap };
}

function rewriteTestIdList(
  ids: string[] | undefined,
  testIdMap: Map<string, string>,
): string[] | undefined {
  if (!ids) {
    return undefined;
  }

  return ids.map(id => testIdMap.get(String(id)) ?? String(id));
}

function appendTestFiles(
  target: Record<string, MutationSeedTestFile>,
  source: Record<string, MutationSeedTestFile>,
): void {
  for (const [fileName, testFile] of Object.entries(source)) {
    const existing = target[fileName];
    if (!existing) {
      target[fileName] = testFile;
      continue;
    }

    target[fileName] = {
      ...existing,
      source: existing.source ?? testFile.source,
      tests: [...existing.tests, ...testFile.tests],
    };
  }
}

function rewriteSourceFile(
  sourceFile: MutationSeedSourceFile,
  testIdMap: Map<string, string>,
): MutationSeedSourceFile {
  return {
    ...sourceFile,
    mutants: sourceFile.mutants.map(mutant => ({
      ...mutant,
      coveredBy: rewriteTestIdList(mutant.coveredBy, testIdMap),
      killedBy: rewriteTestIdList(mutant.killedBy, testIdMap),
    })),
  };
}

export function mergeMutationSeedReports(reports: unknown[]): MutationSeedReport {
  if (reports.length === 0) {
    throw new Error('At least one mutation seed report is required.');
  }

  const parsedReports = reports.map(parseMutationSeedReport);
  const [baseReport] = parsedReports;
  const merged: MutationSeedReport = {
    ...baseReport,
    files: {},
    testFiles: {},
  };
  const nextTestId = { value: 0 };

  for (const report of parsedReports) {
    const { mappedTestFiles, testIdMap } = rewriteTestIds(report.testFiles, nextTestId);
    appendTestFiles(merged.testFiles, mappedTestFiles);

    for (const [fileName, sourceFile] of Object.entries(report.files)) {
      if (merged.files[fileName]) {
        throw new Error(`Mutation seed shard overlap detected for ${fileName}.`);
      }

      merged.files[fileName] = rewriteSourceFile(sourceFile, testIdMap);
    }
  }

  return merged;
}

function findIncrementalFiles(directory: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  const results: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      results.push(...findIncrementalFiles(entryPath));
      continue;
    }

    if (/^stryker-incremental-.+\.json$/.test(entry.name)) {
      results.push(entryPath);
    }
  }

  return results;
}

function packageNameFromIncrementalFile(filePath: string): string {
  const fileName = basename(filePath);
  const match = /^stryker-incremental-(.+)\.json$/.exec(fileName);
  if (!match) {
    throw new Error(`Unable to infer package name from ${filePath}.`);
  }

  return match[1];
}

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function writeMutationSeedReports(options: WriteMutationSeedReportsOptions): string[] {
  const groupedFiles = new Map<string, string[]>();

  for (const file of findIncrementalFiles(options.inputRoot).sort()) {
    const packageName = packageNameFromIncrementalFile(file);
    groupedFiles.set(packageName, [...(groupedFiles.get(packageName) ?? []), file]);
  }

  if (groupedFiles.size === 0) {
    throw new Error(`No mutation seed reports found in ${options.inputRoot}.`);
  }

  const written: string[] = [];
  const repoRoot = dirname(dirname(options.outputRoot));

  for (const [packageName, files] of [...groupedFiles.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const outputFile = join(options.outputRoot, packageName, `stryker-incremental-${packageName}.json`);
    mkdirSync(dirname(outputFile), { recursive: true });

    if (files.length === 1) {
      cpSync(files[0], outputFile);
    } else {
      const reports = files.map(file => JSON.parse(readFileSync(file, 'utf8')) as unknown);
      writeJson(outputFile, mergeMutationSeedReports(reports));
    }

    written.push(relative(repoRoot, outputFile));
  }

  const seedShaPath = join(options.outputRoot, 'seed-sha.txt');
  mkdirSync(dirname(seedShaPath), { recursive: true });
  writeFileSync(seedShaPath, `${options.sha}\n`);
  written.push(relative(repoRoot, seedShaPath));

  return written;
}
