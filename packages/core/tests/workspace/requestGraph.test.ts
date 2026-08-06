import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { requestCodeGraphyIndexWorkspace } from '../../src/workspace/requestIndexing';
import { requestCodeGraphyWorkspaceGraph } from '../../src/workspace/requestGraph';
import {
  readCodeGraphyWorkspaceSettingsOrInitial,
  writeCodeGraphyWorkspaceSettings,
} from '../../src/workspace/settings';

describe('workspace/requestGraph', () => {
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
