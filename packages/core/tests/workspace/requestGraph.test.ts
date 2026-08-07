import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { requestCodeGraphyIndexWorkspace } from '../../src/workspace/requestIndexing';
import { requestCodeGraphyWorkspaceGraph } from '../../src/workspace/requestGraph';
import { readWorkspaceQueryGraph } from '../../src/workspace/queryGraph';
import {
  readCodeGraphyWorkspaceSettingsOrInitial,
  writeCodeGraphyWorkspaceSettings,
} from '../../src/workspace/settings';
import { deriveVisibleGraph } from '../../src/visibleGraph';

describe('workspace/requestGraph', () => {
  it('keeps the File and Folder projection equal to the complete Core query path', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-file-graph-'));
    await fs.mkdir(path.join(workspaceRoot, 'src'));
    await fs.writeFile(
      path.join(workspaceRoot, 'src', 'entry.ts'),
      "import { modelValue } from './model';\nexport function entry() { return modelValue; }\n",
    );
    await fs.writeFile(
      path.join(workspaceRoot, 'src', 'model.ts'),
      'export const modelValue = 1;\n',
    );
    await requestCodeGraphyIndexWorkspace({ workspacePath: workspaceRoot });
    const projection = { nodeTypes: ['file', 'folder'] };
    const complete = readWorkspaceQueryGraph(
      workspaceRoot,
      { version: 3, plugins: [] },
      projection,
    );
    const expected = deriveVisibleGraph(complete.graphData, {
      scope: {
        nodes: Object.entries(complete.scope.nodes).map(([type, enabled]) => ({ type, enabled })),
        edges: Object.entries(complete.scope.edges).map(([type, enabled]) => ({ type, enabled })),
        nodeTypes: complete.nodeTypes,
      },
      showOrphans: true,
    }).graphData;

    const result = requestCodeGraphyWorkspaceGraph({
      workspacePath: workspaceRoot,
      projection,
    });

    expect(result.kind).toBe('ready');
    if (result.kind === 'ready') expect(result.graph).toEqual(expected);
  });

  it('loads the saved Core Graph Scope and Filters without running Indexing', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-graph-'));
    await fs.writeFile(
      path.join(workspaceRoot, 'entry.ts'),
      "import { modelValue } from './model';\nexport const entryValue = modelValue;\n",
    );
    await fs.writeFile(path.join(workspaceRoot, 'model.ts'), 'export const modelValue = 1;\n');
    await requestCodeGraphyIndexWorkspace({ workspacePath: workspaceRoot });

    const symbolProjection = requestCodeGraphyWorkspaceGraph({
      workspacePath: workspaceRoot,
      projection: { nodeTypes: ['file', 'symbol'] },
    });
    expect(symbolProjection.kind).toBe('ready');
    if (symbolProjection.kind === 'ready') {
      expect(symbolProjection.graph.nodes.some(node => node.symbol?.filePath === 'model.ts')).toBe(true);
    }

    const settings = readCodeGraphyWorkspaceSettingsOrInitial(workspaceRoot);
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...settings,
      filterPatterns: ['model.ts'],
    });

    const result = requestCodeGraphyWorkspaceGraph({ workspacePath: workspaceRoot });

    expect(result.kind).toBe('ready');
    if (result.kind !== 'ready') return;
    expect(result.cacheStatus.state).toBe('fresh');
    expect(result.graph.nodes.map(node => node.id)).toContain('entry.ts');
    expect(result.graph.nodes.map(node => node.id)).not.toEqual(expect.arrayContaining([
      expect.stringContaining('model.ts'),
    ]));
    expect(result.graph.edges).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ from: 'entry.ts', to: 'model.ts' }),
    ]));
  });
});
