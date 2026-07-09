import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const filesPerDirectory = 5;
const concurrentDirectoryWrites = 128;
const symbolCountPerFile = 16;
const manifestPath = fileURLToPath(new URL('./manifest.json', import.meta.url));

export interface GeneratedFixtureManifestEntry {
  name: string;
  kind: 'generated';
  fileCount: number;
}

export interface WorkspaceFixtureManifestEntry {
  name: string;
  kind: 'workspace';
  path: string;
}

export interface FixtureManifest {
  schemaVersion: number;
  fixtures: Array<GeneratedFixtureManifestEntry | WorkspaceFixtureManifestEntry>;
}

export interface GenerateFixtureOptions {
  fixture: string;
  outputRoot: string;
  symbols?: boolean;
}

export async function readFixtureManifest(): Promise<FixtureManifest> {
  return JSON.parse(await readFile(manifestPath, 'utf8')) as FixtureManifest;
}

function sourcePath(fileIndex: number): string {
  const groupIndex = Math.floor(fileIndex / filesPerDirectory);
  return posix.join(
    'src',
    `group-${groupIndex.toString().padStart(5, '0')}`,
    `file-${fileIndex.toString().padStart(6, '0')}.ts`,
  );
}

function importSpecifier(fromIndex: number, toIndex: number): string {
  const relativePath = posix.relative(
    posix.dirname(sourcePath(fromIndex)),
    sourcePath(toIndex).replace(/\.ts$/, ''),
  );
  return relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
}

function parentIndexes(fileIndex: number): number[] {
  if (fileIndex === 0) {
    return [];
  }

  return [...new Set([
    Math.floor(fileIndex / 2),
    Math.floor(fileIndex / 3),
  ])].filter(parentIndex => parentIndex !== fileIndex);
}

function renderSource(fileIndex: number, symbols: boolean): string {
  const imports = parentIndexes(fileIndex)
    .map(parentIndex => `import '${importSpecifier(fileIndex, parentIndex)}';`);
  const declarations = [
    `export const file_${fileIndex.toString().padStart(6, '0')} = ${fileIndex};`,
  ];

  if (symbols) {
    for (let symbolIndex = 0; symbolIndex < symbolCountPerFile; symbolIndex += 1) {
      declarations.push(
        `export const symbol_${fileIndex.toString().padStart(6, '0')}_${symbolIndex.toString().padStart(2, '0')} = ${fileIndex + symbolIndex};`,
      );
    }
  }

  return [
    `// Deterministic CodeGraphy performance fixture file ${fileIndex}.`,
    ...imports,
    ...(imports.length > 0 ? [''] : []),
    ...declarations,
    '',
  ].join('\n');
}

async function writeDirectoryGroup(
  outputRoot: string,
  groupIndex: number,
  fileCount: number,
  symbols: boolean,
): Promise<void> {
  const firstIndex = groupIndex * filesPerDirectory;
  const lastIndex = Math.min(firstIndex + filesPerDirectory, fileCount);
  const directoryPath = resolve(outputRoot, dirname(sourcePath(firstIndex)));
  await mkdir(directoryPath, { recursive: true });
  await Promise.all(
    Array.from({ length: lastIndex - firstIndex }, (_, offset) => firstIndex + offset)
      .map(fileIndex => writeFile(
        resolve(outputRoot, sourcePath(fileIndex)),
        renderSource(fileIndex, symbols),
        'utf8',
      )),
  );
}

export async function generateFixture(options: GenerateFixtureOptions): Promise<void> {
  const manifest = await readFixtureManifest();
  const fixture = manifest.fixtures.find(entry => entry.name === options.fixture);
  if (!fixture || fixture.kind !== 'generated') {
    throw new Error(`Unknown generated performance fixture: ${options.fixture}`);
  }

  await rm(options.outputRoot, { recursive: true, force: true });
  await mkdir(options.outputRoot, { recursive: true });

  const directoryCount = Math.ceil(fixture.fileCount / filesPerDirectory);
  for (
    let firstGroup = 0;
    firstGroup < directoryCount;
    firstGroup += concurrentDirectoryWrites
  ) {
    const lastGroup = Math.min(firstGroup + concurrentDirectoryWrites, directoryCount);
    await Promise.all(
      Array.from({ length: lastGroup - firstGroup }, (_, offset) => firstGroup + offset)
        .map(groupIndex => writeDirectoryGroup(
          options.outputRoot,
          groupIndex,
          fixture.fileCount,
          options.symbols === true,
        )),
    );
  }
}

interface CliArguments {
  fixture: string;
  outputRoot: string;
  symbols: boolean;
}

function readCliArguments(arguments_: string[]): CliArguments {
  const fixture = arguments_.find(argument => !argument.startsWith('--'));
  if (!fixture) {
    throw new Error('Usage: generate.ts <fixture> [--output <path>] [--symbols]');
  }

  const outputFlagIndex = arguments_.indexOf('--output');
  const outputRoot = outputFlagIndex >= 0 ? arguments_[outputFlagIndex + 1] : undefined;
  if (outputFlagIndex >= 0 && !outputRoot) {
    throw new Error('--output requires a path');
  }

  return {
    fixture,
    outputRoot: resolve(
      outputRoot ?? fileURLToPath(new URL(`./generated/${fixture}`, import.meta.url)),
    ),
    symbols: arguments_.includes('--symbols'),
  };
}

async function main(): Promise<void> {
  await generateFixture(readCliArguments(process.argv.slice(2)));
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
