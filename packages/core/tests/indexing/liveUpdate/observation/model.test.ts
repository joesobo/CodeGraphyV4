import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  readCodeGraphyWorkspaceSettings,
  subscribeCodeGraphyWorkspaceChanges,
  writeCodeGraphyWorkspaceSettings,
} from '../../../../src';
import { createWorkspace } from '../../workspaceFixture';

describe('workspace change subscription', () => {
  it('reports source changes without reporting Graph Cache writes', async () => {
    const workspaceRoot = await createWorkspace();
    const sourcePath = join(workspaceRoot, 'created.txt');
    const observedPaths = new Set<string>();
    let resolveEvents!: (paths: string[]) => void;
    const receivedPaths = new Promise<string[]>((resolve) => {
      resolveEvents = resolve;
    });
    const subscription = await subscribeCodeGraphyWorkspaceChanges({
      workspaceRoot,
      onEvents(events) {
        for (const event of events) observedPaths.add(event.path);
        if (observedPaths.has(sourcePath)) resolveEvents([...observedPaths]);
      },
    });
    await mkdir(join(workspaceRoot, '.codegraphy'), { recursive: true });
    await writeFile(join(workspaceRoot, '.codegraphy', 'graph.sqlite-journal'), 'cache', 'utf-8');
    const nestedCachePath = join(workspaceRoot, 'fixtures', '.codegraphy', 'graph.sqlite');
    await mkdir(join(workspaceRoot, 'fixtures', '.codegraphy'), { recursive: true });
    await writeFile(nestedCachePath, 'nested cache', 'utf-8');
    await writeFile(sourcePath, 'created\n', 'utf-8');

    const paths = await receivedPaths;

    expect(paths).toContain(sourcePath);
    expect(paths).not.toContain(join(workspaceRoot, '.codegraphy', 'graph.sqlite-journal'));
    expect(paths).not.toContain(nestedCachePath);
    await subscription.dispose();
  }, 10_000);

  it('reports only changes eligible under Git ignored state and active Filters', async () => {
    const workspaceRoot = await createWorkspace();
    execFileSync('git', ['init', '-q'], { cwd: workspaceRoot });
    await writeFile(join(workspaceRoot, '.gitignore'), 'ignored/**\n', 'utf-8');
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      filterPatterns: ['filtered/**'],
    });
    const includedPath = join(workspaceRoot, 'src', 'included.ts');
    const ignoredPath = join(workspaceRoot, 'ignored', 'generated.ts');
    const filteredPath = join(workspaceRoot, 'filtered', 'generated.ts');
    const gitignorePath = join(workspaceRoot, '.gitignore');
    const settingsPath = join(workspaceRoot, '.codegraphy', 'settings.json');
    const observedPaths = new Set<string>();
    let expectedPaths = new Set<string>();
    let resolveExpectedPaths: (() => void) | undefined;
    const waitForPaths = (paths: readonly string[]): Promise<void> => {
      expectedPaths = new Set(paths);
      return new Promise<void>((resolve) => {
        resolveExpectedPaths = resolve;
      });
    };
    const subscription = await subscribeCodeGraphyWorkspaceChanges({
      workspaceRoot,
      onEvents(events) {
        for (const event of events) observedPaths.add(event.path);
        if ([...expectedPaths].every(filePath => observedPaths.has(filePath))) {
          resolveExpectedPaths?.();
        }
      },
    });
    await mkdir(join(workspaceRoot, 'src'), { recursive: true });
    await mkdir(join(workspaceRoot, 'ignored'), { recursive: true });
    await mkdir(join(workspaceRoot, 'filtered'), { recursive: true });
    const includedPathObserved = waitForPaths([includedPath]);
    await writeFile(ignoredPath, 'ignored\n', 'utf-8');
    await writeFile(filteredPath, 'filtered\n', 'utf-8');
    await writeFile(includedPath, 'included\n', 'utf-8');

    await includedPathObserved;
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(observedPaths).toContain(includedPath);
    expect(observedPaths).not.toContain(ignoredPath);
    expect(observedPaths).not.toContain(filteredPath);

    observedPaths.clear();
    const gitignoreChanged = waitForPaths([gitignorePath]);
    await writeFile(gitignorePath, '', 'utf-8');
    await gitignoreChanged;
    observedPaths.clear();
    const newlyUnignoredPathChanged = waitForPaths([ignoredPath]);
    await writeFile(ignoredPath, 'now unignored\n', 'utf-8');
    await newlyUnignoredPathChanged;

    expect(observedPaths).toEqual(new Set([ignoredPath]));

    observedPaths.clear();
    const settingsChanged = waitForPaths([settingsPath]);
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      respectGitignore: false,
      filterPatterns: [],
    });
    await settingsChanged;
    observedPaths.clear();
    const newlyEligiblePathsChanged = waitForPaths([ignoredPath, filteredPath]);
    await writeFile(ignoredPath, 'now included\n', 'utf-8');
    await writeFile(filteredPath, 'now included\n', 'utf-8');
    await newlyEligiblePathsChanged;

    expect(observedPaths).toEqual(new Set([ignoredPath, filteredPath]));
    await subscription.dispose();
  }, 10_000);

  it('keeps default-excluded directory storms outside native observation', async () => {
    const workspaceRoot = await createWorkspace();
    const ignoredDirectory = join(workspaceRoot, 'node_modules');
    const includedDirectory = join(workspaceRoot, 'src');
    const includedPath = join(includedDirectory, 'sentinel.ts');
    await mkdir(ignoredDirectory);
    await mkdir(includedDirectory);
    const observedPaths = new Set<string>();
    const errors: Error[] = [];
    let resolveIncluded!: () => void;
    const includedObserved = new Promise<void>(resolve => { resolveIncluded = resolve; });
    const subscription = await subscribeCodeGraphyWorkspaceChanges({
      workspaceRoot,
      onError: error => errors.push(error),
      onEvents(events) {
        for (const event of events) observedPaths.add(event.path);
        if (observedPaths.has(includedPath)) resolveIncluded();
      },
    });

    await Promise.all(Array.from({ length: 1_000 }, (_, index) => (
      writeFile(join(ignoredDirectory, `package-${index}.js`), 'ignored\n', 'utf-8')
    )));
    await writeFile(includedPath, 'export {};\n', 'utf-8');
    await includedObserved;
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(errors).toEqual([]);
    expect(observedPaths).toEqual(new Set([includedPath]));
    await subscription.dispose();
  }, 10_000);
});
