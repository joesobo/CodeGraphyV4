import { execFile } from 'node:child_process';
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it, onTestFinished } from 'vitest';
import {
  copySelfWorkspace,
  SELF_BATCH_DIRECTORY,
  writeSelfBatchFiles,
} from './selfWorkspace';

const execFileAsync = promisify(execFile);

async function createSourceRepository(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'codegraphy-self-source-'));
  await execFileAsync('git', ['init', '--quiet'], { cwd: root });
  await writeFile(join(root, '.gitignore'), 'node_modules/\nignored/\n', 'utf8');
  await writeFile(join(root, 'tracked.ts'), 'export const indexed = 1;\n', 'utf8');
  await execFileAsync('git', ['add', '.gitignore', 'tracked.ts'], { cwd: root });
  await writeFile(join(root, 'tracked.ts'), 'export const current = 2;\n', 'utf8');
  await writeFile(join(root, 'untracked.tsx'), 'export const view = <div />;\n', 'utf8');
  await mkdir(join(root, 'node_modules', 'heavy'), { recursive: true });
  await writeFile(join(root, 'node_modules', 'heavy', 'index.js'), 'heavy\n', 'utf8');
  await mkdir(join(root, 'ignored'), { recursive: true });
  await writeFile(join(root, 'ignored', 'cache.ts'), 'ignored\n', 'utf8');
  return root;
}

describe('self performance workspace', () => {
  it('copies current tracked and untracked contents without ignored or Git state', async () => {
    const source = await createSourceRepository();
    const destinationRoot = await mkdtemp(join(tmpdir(), 'codegraphy-self-copy-'));
    const destination = join(destinationRoot, 'workspace');
    onTestFinished(async () => {
      await Promise.all([
        rm(source, { recursive: true, force: true }),
        rm(destinationRoot, { recursive: true, force: true }),
      ]);
    });

    const result = await copySelfWorkspace(source, destination);

    expect(await readFile(join(destination, 'tracked.ts'), 'utf8'))
      .toBe('export const current = 2;\n');
    expect(await readFile(join(destination, 'untracked.tsx'), 'utf8'))
      .toBe('export const view = <div />;\n');
    expect(result).toEqual({
      analyzableFileCount: 2,
      copiedPaths: ['.gitignore', 'tracked.ts', 'untracked.tsx'],
    });
    await expect(access(join(destination, 'node_modules'))).rejects.toThrow();
    await expect(access(join(destination, 'ignored'))).rejects.toThrow();
    await expect(access(join(destination, '.git'))).rejects.toThrow();
  });

  it('writes a deterministic 100-file TypeScript membership branch payload', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'codegraphy-self-batch-'));
    onTestFinished(() => rm(workspace, { recursive: true, force: true }));

    const paths = await writeSelfBatchFiles(workspace);
    const entries = await readdir(join(workspace, SELF_BATCH_DIRECTORY));

    expect(paths).toHaveLength(100);
    expect(entries).toHaveLength(100);
    expect(paths[0]).toBe('perf/self-batch-100/file-000.ts');
    expect(paths.at(-1)).toBe('perf/self-batch-100/file-099.ts');
    expect(await readFile(join(workspace, paths[0]), 'utf8')).toBe([
      "import './file-001';",
      '',
      'export const self_perf_batch_000 = 0;',
      '',
    ].join('\n'));
    expect(await readFile(join(workspace, paths[99]), 'utf8'))
      .toContain("import './file-000';");
  });
});
