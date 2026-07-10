import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { generateFixture, readFixtureManifest } from '../fixtures/generate';
import {
  fixtureBatchSourcePaths,
  fixtureImportSpecifier,
} from '../fixtures/paths';
import type { PerfFixture } from '../report';
import { serializePerfFixtureSettings } from './fixtureSettings';
import { writeLinkedPluginCache } from './pluginCache';
import { copySelfWorkspace, writeSelfBatchFiles } from './selfWorkspace';

const execFileAsync = promisify(execFile);
const batchFileCount = 100;

export type GeneratedPerfFixture = 'small' | 'medium' | 'large' | 'huge' | 'giant';

export interface PerfRunEnvironment {
  extensionsPath: string;
  fixture: PerfFixture;
  homePath: string;
  rootPath: string;
  symbols: boolean;
  userDataPath: string;
  workspacePath: string;
  dispose(): Promise<void>;
}

export interface CreatePerfRunEnvironmentOptions {
  fixture: PerfFixture;
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

async function writeFixtureSettings(
  workspacePath: string,
  fileCount: number,
  symbols: boolean,
  include: string[] = ['src/**/*.ts'],
): Promise<void> {
  const settingsDirectory = join(workspacePath, '.codegraphy');
  await mkdir(settingsDirectory, { recursive: true });
  let gitignore = '';
  try {
    gitignore = await readFile(join(workspacePath, '.gitignore'), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const settingsIgnoreEntry = '.codegraphy/*';
  const gitignoreLines = gitignore.split(/\r?\n/);
  const nextGitignore = gitignoreLines.includes(settingsIgnoreEntry)
    ? gitignore
    : `${gitignore}${gitignore && !gitignore.endsWith('\n') ? '\n' : ''}${settingsIgnoreEntry}\n`;
  await Promise.all([
    writeFile(join(workspacePath, '.gitignore'), nextGitignore, 'utf8'),
    writeFile(
      join(settingsDirectory, 'settings.json'),
      serializePerfFixtureSettings({ fileCount, include, symbols }),
      'utf8',
    ),
  ]);
}

async function runGit(workspacePath: string, arguments_: string[]): Promise<void> {
  await execFileAsync('git', arguments_, { cwd: workspacePath });
}

async function prepareFixtureBranches(
  workspacePath: string,
  fileCount: number,
  fixture: PerfFixture,
): Promise<void> {
  await runGit(workspacePath, ['init', '--initial-branch=perf-base']);
  await runGit(workspacePath, ['add', '--all']);
  await runGit(workspacePath, [
    '-c', 'user.name=CodeGraphy Perf',
    '-c', 'user.email=perf@codegraphy.invalid',
    'commit', '--quiet', '-m', 'perf fixture base',
  ]);
  await runGit(workspacePath, ['switch', '--quiet', '-c', 'perf-batch-100']);

  if (fixture === 'self') {
    await writeSelfBatchFiles(workspacePath);
  } else {
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
  }
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
  if (options.fixture === 'self' && options.symbols === true) {
    throw new Error('--symbols is not supported for the self performance fixture');
  }
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
    const generatedFileCount = options.fixture === 'self'
      ? undefined
      : await generatedFixtureFileCount(options.fixture);
    const selfCopy = options.fixture === 'self'
      ? await copySelfWorkspace(options.repoRoot, workspacePath)
      : undefined;
    const fileCount = generatedFileCount
      ?? (selfCopy?.analyzableFileCount ?? 0) + batchFileCount;
    await Promise.all([
      ...(options.fixture === 'self'
        ? []
        : [generateFixture({
            fixture: options.fixture,
            outputRoot: workspacePath,
            symbols: options.symbols === true,
          })]),
      mkdir(homePath, { recursive: true }),
      mkdir(userDataPath, { recursive: true }),
      mkdir(extensionsPath, { recursive: true }),
    ]);
    await writeFixtureSettings(
      workspacePath,
      fileCount,
      options.symbols === true,
      options.fixture === 'self' ? ['**/*.ts', '**/*.tsx'] : undefined,
    );
    await writeLinkedPluginCache({
      homePath,
      packageRoot: join(options.repoRoot, 'packages', 'plugin-typescript'),
    });
    await prepareFixtureBranches(workspacePath, fileCount, options.fixture);
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
