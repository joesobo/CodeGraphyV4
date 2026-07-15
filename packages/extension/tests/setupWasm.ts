import { buildOwnedGraphPhysics } from '../scripts/buildOwnedGraphPhysics';

export async function setup(): Promise<void> {
  await buildOwnedGraphPhysics();
}
