import { createHash } from 'node:crypto';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { describe, expect, it, onTestFinished } from 'vitest';
import { generateFixture, readFixtureManifest } from './generate';

async function listFiles(root: string, directory = root): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(root, entryPath) : [entryPath];
  }));

  return files.flat().sort((left, right) => left.localeCompare(right));
}

async function hashTree(root: string): Promise<string> {
  const hash = createHash('sha256');
  for (const filePath of await listFiles(root)) {
    hash.update(relative(root, filePath).split(sep).join('/'));
    hash.update('\0');
    hash.update(await readFile(filePath));
    hash.update('\0');
  }
  return hash.digest('hex');
}

describe('performance fixture generation', () => {
  const fixtureSizes = [
    { fixture: 'small', fileCount: 100 },
    { fixture: 'medium', fileCount: 1_000 },
    { fixture: 'large', fileCount: 5_000 },
    { fixture: 'huge', fileCount: 10_000 },
  ] as const;
  const deterministicFixtureConfigurations = [
    { fixture: 'small', variant: 'default', symbols: false },
    { fixture: 'medium', variant: 'default', symbols: false },
    { fixture: 'large', variant: 'default', symbols: false },
    { fixture: 'huge', variant: 'default', symbols: false },
    { fixture: 'huge', variant: '--symbols', symbols: true },
  ] as const;

  it('caps active fixture checks at 10k files', () => {
    expect(fixtureSizes.every(({ fileCount }) => fileCount <= 10_000)).toBe(true);
    expect(deterministicFixtureConfigurations.map(({ fixture }) => fixture)).toEqual([
      'small',
      'medium',
      'large',
      'huge',
      'huge',
    ]);
  });

  it('identifies the monorepo as the self fixture', async () => {
    const manifest = await readFixtureManifest();

    expect(manifest.fixtures.find(fixture => fixture.name === 'self')).toEqual({
      name: 'self',
      kind: 'workspace',
      path: '../..',
    });
  });

  it.each(deterministicFixtureConfigurations)(
    'regenerates the $fixture $variant fixture byte for byte',
    { timeout: 120_000 },
    async ({ fixture, symbols }) => {
      const [firstRoot, secondRoot] = await Promise.all([
        mkdtemp(join(tmpdir(), `codegraphy-perf-${fixture}-first-`)),
        mkdtemp(join(tmpdir(), `codegraphy-perf-${fixture}-second-`)),
      ]);
      onTestFinished(async () => {
        await Promise.all([
          rm(firstRoot, { recursive: true, force: true }),
          rm(secondRoot, { recursive: true, force: true }),
        ]);
      });

      await generateFixture({ fixture, outputRoot: firstRoot, symbols });
      await generateFixture({ fixture, outputRoot: secondRoot, symbols });

      expect(await hashTree(secondRoot)).toBe(await hashTree(firstRoot));
    },
  );

  it.each(fixtureSizes)(
    'writes $fileCount source files for $fixture',
    { timeout: 120_000 },
    async ({ fixture, fileCount }) => {
      const outputRoot = await mkdtemp(join(tmpdir(), `codegraphy-perf-${fixture}-`));
      onTestFinished(() => rm(outputRoot, { recursive: true, force: true }));

      await generateFixture({ fixture, outputRoot });

      expect(await listFiles(outputRoot)).toHaveLength(fileCount);
    },
  );

  it('uses the declared parent import pattern', async () => {
    const outputRoot = await mkdtemp(join(tmpdir(), 'codegraphy-perf-imports-'));
    onTestFinished(() => rm(outputRoot, { recursive: true, force: true }));
    await generateFixture({ fixture: 'small', outputRoot });

    const source = await readFile(
      join(outputRoot, 'src/group-00001/file-000006.ts'),
      'utf8',
    );

    expect(source).toContain("import '../group-00000/file-000003';");
    expect(source).toContain("import '../group-00000/file-000002';");
  });

  it('expands symbol-heavy source files', async () => {
    const outputRoot = await mkdtemp(join(tmpdir(), 'codegraphy-perf-symbols-'));
    onTestFinished(() => rm(outputRoot, { recursive: true, force: true }));
    await generateFixture({ fixture: 'small', outputRoot, symbols: true });

    const source = await readFile(
      join(outputRoot, 'src/group-00000/file-000000.ts'),
      'utf8',
    );

    expect(source.match(/^export const /gm)).toHaveLength(17);
  });
});
