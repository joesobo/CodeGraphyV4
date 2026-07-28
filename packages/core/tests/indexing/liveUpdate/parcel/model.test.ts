import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { subscribeCodeGraphyWorkspaceChanges } from '../../../../src';
import { createWorkspace } from '../../workspaceFixture';

describe('Parcel workspace change subscription', () => {
  it('reports source changes without reporting Graph Cache writes', async () => {
    const workspaceRoot = await createWorkspace();
    let resolveEvents!: (paths: string[]) => void;
    const receivedPaths = new Promise<string[]>((resolve) => {
      resolveEvents = resolve;
    });
    const subscription = await subscribeCodeGraphyWorkspaceChanges({
      workspaceRoot,
      onEvents(events) {
        resolveEvents(events.map(event => event.path));
      },
    });
    await mkdir(join(workspaceRoot, '.codegraphy'), { recursive: true });
    await writeFile(join(workspaceRoot, '.codegraphy', 'graph.sqlite-journal'), 'cache', 'utf-8');
    const sourcePath = join(workspaceRoot, 'created.txt');
    await writeFile(sourcePath, 'created\n', 'utf-8');

    const paths = await receivedPaths;

    expect(paths).toContain(sourcePath);
    expect(paths).not.toContain(join(workspaceRoot, '.codegraphy', 'graph.sqlite-journal'));
    await subscription.dispose();
  }, 10_000);
});
