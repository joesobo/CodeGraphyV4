import type { CodeGraphyAPI } from './fixture';
import { sleep } from './fixture';
import { requestNodeBounds, type NodeBounds } from './messages';

function didNodeLayoutStabilize(
  previousNodes: NodeBounds[],
  nextNodes: NodeBounds[],
  movementThreshold = 0.75,
): boolean {
  if (previousNodes.length === 0 || previousNodes.length !== nextNodes.length) return false;

  const previousById = new Map(previousNodes.map(node => [node.id, node]));
  return nextNodes.every(node => {
    const previousNode = previousById.get(node.id);
    if (!previousNode) return false;
    const deltaX = node.x - previousNode.x;
    const deltaY = node.y - previousNode.y;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY) <= movementThreshold;
  });
}

export async function waitForStableNodeBounds(
  api: CodeGraphyAPI,
  timeoutMs: number,
): Promise<NodeBounds[]> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const firstSample = await requestNodeBounds(api);
    if (firstSample.length === 0) {
      await sleep(500);
      continue;
    }

    await sleep(750);
    const secondSample = await requestNodeBounds(api);
    if (didNodeLayoutStabilize(firstSample, secondSample)) return secondSample;
  }

  throw new Error('Rendered node positions never stabilized');
}

export async function setDepthMode(api: CodeGraphyAPI, depthMode: boolean): Promise<void> {
  await api.dispatchWebviewMessage({
    type: 'UPDATE_DEPTH_MODE',
    payload: { depthMode },
  });
}
