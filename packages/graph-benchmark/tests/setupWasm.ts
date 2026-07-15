import { buildOwnedGraphPhysics } from '../../extension/scripts/buildOwnedGraphPhysics';

export async function setup(): Promise<void> {
  await buildOwnedGraphPhysics();
}
