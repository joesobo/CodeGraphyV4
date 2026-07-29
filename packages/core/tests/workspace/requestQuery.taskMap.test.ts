import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { requestCodeGraphyIndexWorkspace } from '../../src/workspace/requestIndexing';
import { requestWorkspaceGraphQuery } from '../../src/workspace/requestQuery';

describe('workspace/requestQuery', () => {
  it('builds a task-personalized File map from live terms and cached Relationships', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-query-task-map-'));
    await fs.writeFile(path.join(workspaceRoot, 'setting.ts'), 'export function readSetting(): string { return "value"; }\n');
    await fs.writeFile(path.join(workspaceRoot, 'command.ts'), [
      "import { readSetting } from './setting';",
      'export function runCommand(): string { return readSetting(); }',
      '',
    ].join('\n'));
    await requestCodeGraphyIndexWorkspace({ workspacePath: workspaceRoot });

    const result = await requestWorkspaceGraphQuery({
      workspacePath: workspaceRoot,
      report: 'task-map',
      arguments: { query: 'setting command', limit: 4 },
    });

    expect(result).toMatchObject({
      terms: ['setting', 'command'],
      files: [
        { path: 'command.ts', matchedTerms: ['setting', 'command'] },
        { path: 'setting.ts', matchedTerms: ['setting'] },
      ],
      relationships: [{ from: 'command.ts', to: 'setting.ts', edgeTypes: expect.arrayContaining(['import']) }],
      limits: { complete: true },
      sources: { text: { freshness: 'live' }, graph: { freshness: 'cached', cacheState: 'fresh' } },
    });

    const projected = await requestWorkspaceGraphQuery({
      workspacePath: workspaceRoot,
      report: 'task-map',
      arguments: { query: 'setting command', limit: 4 },
      projection: { edgeTypes: ['type-import'] },
    });
    expect(projected.files).toHaveLength(2);
    expect(projected.relationships).toEqual([]);
  });
});
