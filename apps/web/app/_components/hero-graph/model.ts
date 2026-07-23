import type { GraphLayoutInput } from '@codegraphy-dev/graph-renderer';
import type { HeroGraphData } from './types';

const COMMUNITY_COUNT = 6;
const MAX_NODE_COUNT = 104;
const MIN_NODE_COUNT = 78;

export function createGraphData(): HeroGraphData {
  const random = createSeededRandom(createRandomSeed());
  const nodeCount = MIN_NODE_COUNT + Math.floor(random() * (MAX_NODE_COUNT - MIN_NODE_COUNT + 1));
  const nodeIds: string[] = Array.from({ length: nodeCount }, (_, index) => `hero-node-${index}`);
  const radii = new Float32Array(nodeCount);
  const chargeStrengthMultipliers = new Float32Array(nodeCount);
  const initialX = new Float32Array(nodeCount);
  const initialY = new Float32Array(nodeCount);
  const nodeGroups = new Uint8Array(nodeCount);
  const nodeHoverScales = new Float32Array(nodeCount);
  const nodeOpacities = new Float32Array(nodeCount);
  const orbitSpeedMultipliers = new Float32Array(nodeCount);
  const edgeSources: number[] = [];
  const edgeTargets: number[] = [];
  const membersByCommunity: number[][] = Array.from(
    { length: COMMUNITY_COUNT },
    (): number[] => [],
  );

  for (let index = 0; index < nodeCount; index += 1) {
    const group = index < COMMUNITY_COUNT
      ? index
      : Math.floor(random() * COMMUNITY_COUNT);
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random()) * 300;
    const isCommunitySeed = index < COMMUNITY_COUNT;

    nodeGroups[index] = group;
    nodeHoverScales[index] = 1;
    nodeOpacities[index] = 0.25 + random() * 0.25;
    orbitSpeedMultipliers[index] = 0.7 + random() * 0.65;
    membersByCommunity[group].push(index);
    radii[index] = isCommunitySeed ? 15 + random() * 3 : 6 + random() * 6;
    chargeStrengthMultipliers[index] = isCommunitySeed ? 1.28 : 0.68 + random() * 0.42;
    initialX[index] = Math.cos(angle) * distance * 1.3;
    initialY[index] = Math.sin(angle) * distance * 0.68;
  }

  // Dense local relationships form communities naturally. Sparse cross-group
  // relationships keep the result one connected graph.
  for (const members of membersByCommunity) {
    for (let memberIndex = 1; memberIndex < members.length; memberIndex += 1) {
      const source = members[memberIndex];
      const firstTarget = members[Math.floor(random() * memberIndex)];
      edgeSources.push(source);
      edgeTargets.push(firstTarget);

      if (memberIndex > 2) {
        const secondTarget = members[Math.floor(random() * memberIndex)];
        if (secondTarget !== firstTarget) {
          edgeSources.push(source);
          edgeTargets.push(secondTarget);
        }
      }

      if (memberIndex > 4 && random() < 0.68) {
        const thirdTarget = members[Math.floor(random() * memberIndex)];
        if (thirdTarget !== firstTarget) {
          edgeSources.push(source);
          edgeTargets.push(thirdTarget);
        }
      }
    }
  }

  for (let group = 0; group < COMMUNITY_COUNT; group += 1) {
    const nextGroup = (group + 1) % COMMUNITY_COUNT;
    edgeSources.push(
      membersByCommunity[group][Math.floor(random() * membersByCommunity[group].length)],
    );
    edgeTargets.push(
      membersByCommunity[nextGroup][Math.floor(random() * membersByCommunity[nextGroup].length)],
    );

    const bridgeGroup = (group + 2 + Math.floor(random() * 3)) % COMMUNITY_COUNT;
    edgeSources.push(
      membersByCommunity[group][Math.floor(random() * membersByCommunity[group].length)],
    );
    edgeTargets.push(
      membersByCommunity[bridgeGroup][Math.floor(random() * membersByCommunity[bridgeGroup].length)],
    );
  }

  const input = {
    chargeStrengthMultipliers,
    edgeSources: Uint32Array.from(edgeSources),
    edgeTargets: Uint32Array.from(edgeTargets),
    initialX,
    initialY,
    nodeIds,
    radii,
  } satisfies GraphLayoutInput;

  return {
    input,
    nodeGroups,
    nodeHoverScales,
    nodeOpacities,
    orbitSpeedMultipliers,
  };
}

function createRandomSeed(): number {
  const values = new Uint32Array(1);
  window.crypto.getRandomValues(values);
  return values[0] ?? Date.now();
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return (): number => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
