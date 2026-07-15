import { buildGraphPhysics } from '../../graph-renderer/scripts/buildPhysics';

export async function setup(): Promise<void> {
  await buildGraphPhysics();
}
