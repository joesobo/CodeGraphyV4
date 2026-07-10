import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { BenchmarkFixture } from '../fixture/presets';

const WRITE_BATCH_SIZE = 100;

function noteName(index: number): string {
  return `node-${index.toString().padStart(6, '0')}`;
}

function buildNote(
  fixture: BenchmarkFixture,
  nodeIndex: number,
  targetNoteNames: readonly string[],
): string {
  const node = fixture.graph.nodes[nodeIndex];
  const relationships = targetNoteNames.length === 0
    ? '_No outgoing relationships._'
    : targetNoteNames.map((target) => `- [[${target}]]`).join('\n');

  return `---
codegraphyId: ${JSON.stringify(node.id)}
fixtureHash: ${JSON.stringify(fixture.fixtureHash)}
---

# ${node.label}

\`${node.id}\`

## Relationships

${relationships}
`;
}

export async function writeObsidianVault(
  fixture: BenchmarkFixture,
  outputDirectory: string,
): Promise<void> {
  const noteNamesByNodeId = new Map(
    fixture.graph.nodes.map((node, index) => [node.id, noteName(index)]),
  );
  const targetsBySourceId = new Map<string, string[]>();
  fixture.graph.edges.forEach((edge) => {
    const targetNoteName = noteNamesByNodeId.get(edge.to);
    if (!targetNoteName) throw new Error(`Fixture edge has a missing target: ${edge.id}`);
    const targets = targetsBySourceId.get(edge.from) ?? [];
    if (!targetsBySourceId.has(edge.from)) targetsBySourceId.set(edge.from, targets);
    targets.push(targetNoteName);
  });

  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });

  for (let start = 0; start < fixture.graph.nodes.length; start += WRITE_BATCH_SIZE) {
    const batch = fixture.graph.nodes.slice(start, start + WRITE_BATCH_SIZE);
    await Promise.all(batch.map((node, offset) => {
      const nodeIndex = start + offset;
      const notePath = path.join(outputDirectory, `${noteName(nodeIndex)}.md`);
      const content = buildNote(
        fixture,
        nodeIndex,
        targetsBySourceId.get(node.id) ?? [],
      );
      return writeFile(notePath, content);
    }));
  }

  await writeFile(
    path.join(outputDirectory, 'codegraphy-fixture.json'),
    `${JSON.stringify({
      fixtureHash: fixture.fixtureHash,
      nodeCount: fixture.summary.nodeCount,
      edgeCount: fixture.summary.edgeCount,
    }, null, 2)}\n`,
  );
}
