import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { requestCodeGraphyIndexWorkspace } from '../../src/workspace/requestIndexing';
import { requestWorkspaceGraphQuery } from '../../src/workspace/requestQuery';

describe('workspace/requestQuery change impact', () => {
  it('uses complete cached relationships and reports stale evidence after source changes', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-query-impact-'));
    const modelPath = path.join(workspaceRoot, 'model.ts');
    await fs.writeFile(modelPath, 'export function readModel(): number { return 1; }\n');
    await fs.writeFile(path.join(workspaceRoot, 'consumer.ts'), [
      "import { readModel } from './model';",
      'export function readConsumer(): number { return readModel(); }',
      '',
    ].join('\n'));
    await requestCodeGraphyIndexWorkspace({ workspacePath: workspaceRoot });
    await fs.writeFile(modelPath, 'export function readModel(): number { return 2; }\n');

    const result = await requestWorkspaceGraphQuery({
      workspacePath: workspaceRoot,
      report: 'change-impact',
      arguments: {
        targets: ['model.ts#readModel:function'],
        limit: 20,
        maxDepth: 3,
      },
    });

    expect(result).toMatchObject({
      targets: [{
        path: 'model.ts#readModel:function',
        filePath: 'model.ts',
      }],
      affected: [{
        path: 'consumer.ts',
        symbols: [{
          id: 'consumer.ts#readConsumer:function',
          name: 'readConsumer',
        }],
        evidence: {
          relationships: [{
            from: 'consumer.ts#readConsumer:function',
            to: 'model.ts#readModel:function',
            edgeType: 'call',
          }],
        },
      }],
      sources: {
        graph: {
          freshness: 'cached',
          cacheState: 'stale',
        },
      },
      cacheStatus: {
        state: 'fresh',
      },
    });
  });
});
