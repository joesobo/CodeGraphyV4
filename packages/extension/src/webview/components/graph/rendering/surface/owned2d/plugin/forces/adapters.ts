import type { ExtensionGraphViewContributionSet } from '@codegraphy-dev/extension-plugin-api';
import { MAX_GRAPH_COORDINATE, MAX_GRAPH_VELOCITY } from '@codegraphy-dev/graph-renderer';
import type { IGraphViewForceAdapter } from '@codegraphy-dev/extension-plugin-api';
import type { IPhysicsSettings } from '../../../../../../../../shared/settings/physics';
import type { IGraphData } from '../../../../../../../../shared/graph/contracts';
import type { FGLink, FGNode } from '../../../../../model/build';

type ForceContribution = ExtensionGraphViewContributionSet['forces'][number];
interface InstalledForce {
  adapter: IGraphViewForceAdapter;
  contribution: ForceContribution['contribution'];
  contextSignature: string;
  links: readonly FGLink[];
  nodes: readonly FGNode[];
  rollback: Float64Array;
}
export type InstalledForceAdapters = Map<string, InstalledForce>;

const KINEMATICS_STRIDE = 6;

function report(key: string, phase: string, error: unknown): void {
  console.error(`[CodeGraphy] Plugin graph force ${key} ${phase} failed:`, error);
}

function dispose(key: string, adapter: IGraphViewForceAdapter): void {
  try { adapter.dispose(); } catch (error) { report(key, 'dispose', error); }
}

export function removeInactiveForces(
  installed: InstalledForceAdapters,
  active: ReadonlySet<string>,
): boolean {
  let changed = false;
  for (const [key, current] of installed) {
    if (active.has(key)) continue;
    installed.delete(key);
    dispose(key, current.adapter);
    changed = true;
  }
  return changed;
}

function createRollback(nodes: readonly FGNode[]): Float64Array {
  return new Float64Array(nodes.length * KINEMATICS_STRIDE);
}

function snapshotNodeKinematics(nodes: readonly FGNode[], snapshot: Float64Array): void {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    const offset = index * KINEMATICS_STRIDE;
    snapshot[offset] = node.x ?? Number.NaN;
    snapshot[offset + 1] = node.y ?? Number.NaN;
    snapshot[offset + 2] = node.vx ?? Number.NaN;
    snapshot[offset + 3] = node.vy ?? Number.NaN;
    snapshot[offset + 4] = node.fx ?? Number.NaN;
    snapshot[offset + 5] = node.fy ?? Number.NaN;
  }
}

function restoreValue(value: number): number | undefined {
  return Number.isNaN(value) ? undefined : value;
}

function restoreNodeKinematics(nodes: readonly FGNode[], snapshot: Float64Array): void {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    const offset = index * KINEMATICS_STRIDE;
    node.x = restoreValue(snapshot[offset]);
    node.y = restoreValue(snapshot[offset + 1]);
    node.vx = restoreValue(snapshot[offset + 2]);
    node.vy = restoreValue(snapshot[offset + 3]);
    node.fx = restoreValue(snapshot[offset + 4]);
    node.fy = restoreValue(snapshot[offset + 5]);
  }
}

function assertFloat32(value: number | undefined, field: string): void {
  if (value === undefined) return;
  if (!Number.isFinite(value) || !Number.isFinite(Math.fround(value))) {
    throw new Error(`Plugin graph force ${field} must fit the finite 32-bit float range`);
  }
  const maximum = field === 'vx' || field === 'vy'
    ? MAX_GRAPH_VELOCITY
    : MAX_GRAPH_COORDINATE;
  if (Math.abs(value) > maximum) {
    throw new Error(`Plugin graph force ${field} must have magnitude at most ${maximum}`);
  }
}

function matchesSnapshot(value: number | undefined, snapshot: number): boolean {
  return value === undefined ? Number.isNaN(snapshot) : value === snapshot;
}

function validateAndDetectChanges(nodes: readonly FGNode[], snapshot: Float64Array): boolean {
  let changed = false;
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    assertFloat32(node.x, 'x');
    assertFloat32(node.y, 'y');
    assertFloat32(node.vx, 'vx');
    assertFloat32(node.vy, 'vy');
    assertFloat32(node.fx, 'fx');
    assertFloat32(node.fy, 'fy');
    const offset = index * KINEMATICS_STRIDE;
    changed ||= !matchesSnapshot(node.x, snapshot[offset])
      || !matchesSnapshot(node.y, snapshot[offset + 1])
      || !matchesSnapshot(node.vx, snapshot[offset + 2])
      || !matchesSnapshot(node.vy, snapshot[offset + 3])
      || !matchesSnapshot(node.fx, snapshot[offset + 4])
      || !matchesSnapshot(node.fy, snapshot[offset + 5]);
  }
  return changed;
}

export function tickInstalledForces(
  installed: InstalledForceAdapters,
  alpha?: number,
): boolean {
  let changed = false;
  for (const [key, current] of installed) {
    snapshotNodeKinematics(current.nodes, current.rollback);
    try {
      current.adapter.tick?.(alpha);
      changed = validateAndDetectChanges(current.nodes, current.rollback) || changed;
    } catch (error) {
      restoreNodeKinematics(current.nodes, current.rollback);
      report(key, 'tick', error);
    }
  }
  return changed;
}

export function disposeInstalledForces(installed: InstalledForceAdapters): void {
  const entries = [...installed];
  installed.clear();
  for (const [key, current] of entries) dispose(key, current.adapter);
}

export function syncForceContribution(
  installed: InstalledForceAdapters,
  key: string,
  entry: ForceContribution,
  data: { nodes: FGNode[]; links: FGLink[] },
  graph: IGraphData,
  signature: string,
  settings: IPhysicsSettings | undefined,
): boolean {
  const current = installed.get(key);
  if (current?.contribution === entry.contribution && current.nodes === data.nodes
    && current.links === data.links && current.contextSignature === signature) return false;

  const rollback = createRollback(data.nodes);
  snapshotNodeKinematics(data.nodes, rollback);
  let adapter: IGraphViewForceAdapter | undefined;
  try {
    adapter = entry.contribution.create({
      nodes: data.nodes,
      edges: graph.edges,
      visibleGraph: graph,
      physicsSettings: settings,
    });
    adapter.initialize?.(data.nodes);
    validateAndDetectChanges(data.nodes, rollback);
  } catch (error) {
    restoreNodeKinematics(data.nodes, rollback);
    if (adapter) dispose(key, adapter);
    report(key, 'setup', error);
    return false;
  }

  installed.set(key, {
    adapter,
    contribution: entry.contribution,
    contextSignature: signature,
    links: data.links,
    nodes: data.nodes,
    rollback,
  });
  if (current) dispose(key, current.adapter);
  return true;
}
