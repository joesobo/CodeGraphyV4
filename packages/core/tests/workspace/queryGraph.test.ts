import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { requestCodeGraphyIndexWorkspace } from '../../src/workspace/requestIndexing';
import {
  projectWorkspaceQueryGraph,
  readWorkspaceQuerySource,
} from '../../src/workspace/queryGraph';

describe('workspace/queryGraph', () => {
  it('projects independent Filters without mutating the shared query source', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-query-source-'));
    await fs.writeFile(path.join(workspaceRoot, 'entry.txt'), 'entry\n');
    await fs.writeFile(path.join(workspaceRoot, 'model.txt'), 'model\n');
    await requestCodeGraphyIndexWorkspace({ workspacePath: workspaceRoot });
    const source = readWorkspaceQuerySource(workspaceRoot, { version: 3, plugins: [] });

    const filtered = projectWorkspaceQueryGraph(source, { filterPatterns: ['model.txt'] });
    const complete = projectWorkspaceQueryGraph(source);

    expect(filtered.graphData.nodes.map(node => node.id)).toEqual(['entry.txt']);
    expect(complete.graphData.nodes.map(node => node.id)).toEqual(['entry.txt', 'model.txt']);
    expect(source.graphData.nodes.map(node => node.id)).toEqual(['entry.txt', 'model.txt']);
  });
});
