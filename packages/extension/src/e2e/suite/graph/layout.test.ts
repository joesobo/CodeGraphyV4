import * as assert from 'assert';
import * as path from 'path';
import { ensureIndexedGraph, getAPI } from './fixture';
import { waitForStableNodeBounds } from './layoutFixture';

suite('Graph: Physics Stabilization', function () {
  this.timeout(30_000);

  test('graph layout stabilizes within 10 seconds of opening', async function() {
    const api = await getAPI();
    await ensureIndexedGraph(api);
    await waitForStableNodeBounds(api, 10_000);
  });
});

suite('Graph: No Node Overlap After Stabilization', function () {
  this.timeout(30_000);

  test('no two nodes overlap after physics stabilizes', async function() {
    const api = await getAPI();
    await ensureIndexedGraph(api);

    const nodes = await waitForStableNodeBounds(api, 15_000);
    assert.ok(nodes.length > 0, 'Expected at least one node');

    // Check every pair for overlap
    const overlapping: string[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];
        const dist = Math.sqrt(Math.pow(nodeA.x - nodeB.x, 2) + Math.pow(nodeA.y - nodeB.y, 2));
        const minDist = nodeA.size + nodeB.size;
        if (dist < minDist) {
          overlapping.push(`"${path.basename(nodeA.id)}" ↔ "${path.basename(nodeB.id)}" (dist=${dist.toFixed(1)}, need≥${minDist})`);
        }
      }
    }

    assert.strictEqual(
      overlapping.length,
      0,
      `${overlapping.length} overlapping node pair(s):\n  ${overlapping.join('\n  ')}`
    );
  });
});
