import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { subscribeCodeGraphyWorkspaceChanges } from '../../../../src';
import { createWorkspace } from '../../workspaceFixture';

describe('Parcel workspace change subscription', () => {
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
});
