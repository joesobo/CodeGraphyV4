import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { linkCodeGraphyInstalledPluginPackage } from '@codegraphy-dev/core';
import { createDefaultCodeGraphyRepoSettings } from '../../packages/extension/src/extension/repoSettings/defaults';
import { serializeSettings } from '../../packages/extension/src/extension/repoSettings/store/persistence/serialization';
import { generateFixture, readFixtureManifest } from '../fixtures/generate';
import {
  fixtureBatchSourcePaths,
  fixtureImportSpecifier,
} from '../fixtures/paths';

const execFileAsync = promisify(execFile);
const batchFileCount = 100;

export type GeneratedPerfFixture = 'small' | 'medium' | 'large' | 'huge' | 'giant';

export interface PerfRunEnvironment {
  extensionsPath: string;
  fixture: GeneratedPerfFixture;
  homePath: string;
  rootPath: string;
  symbols: boolean;
  userDataPath: string;
  workspacePath: string;
  dispose(): Promise<void>;
}

export interface CreatePerfRunEnvironmentOptions {
  fixture: GeneratedPerfFixture;
  repoRoot: string;
  symbols?: boolean;
}

async function generatedFixtureFileCount(fixture: GeneratedPerfFixture): Promise<number> {
  const manifest = await readFixtureManifest();
  const entry = manifest.fixtures.find(candidate => candidate.name === fixture);
  if (!entry || entry.kind !== 'generated') {
    throw new Error(`Missing generated performance fixture manifest entry: ${fixture}`);
  }
  return entry.fileCount;
}

function enableSymbolScopes(nodeVisibility: Record<string, boolean>): void {
  for (const key of Object.keys(nodeVisibility)) {
    if (key === 'variable' || key.includes('symbol')) {
      nodeVisibility[key] = true;
    }
  }
}

async function writeFixtureSettings(
  workspacePath: string,
  fileCount: number,
  symbols: boolean,
): Promise<void> {
  const settings = createDefaultCodeGraphyRepoSettings();
  settings.include = ['src/**/*.ts'];
  settings.maxFiles = fileCount;
  settings.plugins.push({ id: 'codegraphy.typescript', enabled: true });
  if (symbols) enableSymbolScopes(settings.nodeVisibility);

  const settingsDirectory = join(workspacePath, '.codegraphy');
  await mkdir(settingsDirectory, { recursive: true });
  await Promise.all([
    writeFile(join(workspacePath, '.gitignore'), '.codegraphy/*\n', 'utf8'),
    writeFile(join(settingsDirectory, 'settings.json'), serializeSettings(settings), 'utf8'),
  ]);
}

async function runGit(workspacePath: string, arguments_: string[]): Promise<void> {
  await execFileAsync('git', arguments_, { cwd: workspacePath });
}

async function prepareFixtureBranches(
  workspacePath: string,
  fileCount: number,
): Promise<void> {
  await runGit(workspacePath, ['init', '--initial-branch=perf-base']);
  await runGit(workspacePath, ['add', '--all']);
  await runGit(workspacePath, [
    '-c', 'user.name=CodeGraphy Perf',
    '-c', 'user.email=perf@codegraphy.invalid',
    'commit', '--quiet', '-m', 'perf fixture base',
  ]);
  await runGit(workspacePath, ['switch', '--quiet', '-c', 'perf-batch-100']);

  const sourcePaths = fixtureBatchSourcePaths(fileCount, batchFileCount);
  const firstBatchIndex = fileCount - batchFileCount;
  await Promise.all(sourcePaths.map(async (sourcePath, offset) => {
    const fileIndex = firstBatchIndex + offset;
    const nextIndex = offset === sourcePaths.length - 1
      ? firstBatchIndex
      : fileIndex + 1;
    const filePath = join(workspacePath, sourcePath);
    const content = await readFile(filePath, 'utf8');
    await writeFile(
      filePath,
      `import '${fixtureImportSpecifier(fileIndex, nextIndex)}';\n${content}`,
      'utf8',
    );
  }));
  await runGit(workspacePath, ['add', '--all']);
  await runGit(workspacePath, [
    '-c', 'user.name=CodeGraphy Perf',
    '-c', 'user.email=perf@codegraphy.invalid',
    'commit', '--quiet', '-m', 'perf fixture batch change',
  ]);
  await runGit(workspacePath, ['switch', '--quiet', 'perf-base']);
}

export async function createPerfRunEnvironment(
  options: CreatePerfRunEnvironmentOptions,
): Promise<PerfRunEnvironment> {
  const rootPath = await mkdtemp(join(
    process.platform === 'darwin' ? '/tmp' : tmpdir(),
    'cgp-',
  ));
  const workspacePath = join(rootPath, 'workspace');
  const profilePath = join(rootPath, 'profile');
  const homePath = join(profilePath, 'home');
  const userDataPath = join(profilePath, 'user-data');
  const extensionsPath = join(profilePath, 'extensions');

  try {
    const fileCount = await generatedFixtureFileCount(options.fixture);
    await Promise.all([
      generateFixture({
        fixture: options.fixture,
        outputRoot: workspacePath,
        symbols: options.symbols === true,
      }),
      mkdir(homePath, { recursive: true }),
      mkdir(userDataPath, { recursive: true }),
      mkdir(extensionsPath, { recursive: true }),
    ]);
    await writeFixtureSettings(
      workspacePath,
      fileCount,
      options.symbols === true,
    );
    await linkCodeGraphyInstalledPluginPackage({
      homeDir: homePath,
      packageRoot: join(options.repoRoot, 'packages', 'plugin-typescript'),
    });
    await prepareFixtureBranches(workspacePath, fileCount);
  } catch (error) {
    await rm(rootPath, { recursive: true, force: true });
    throw error;
  }

  return {
    extensionsPath,
    fixture: options.fixture,
    homePath,
    rootPath,
    symbols: options.symbols === true,
    userDataPath,
    workspacePath,
    dispose: () => rm(rootPath, { recursive: true, force: true }),
  };
}
