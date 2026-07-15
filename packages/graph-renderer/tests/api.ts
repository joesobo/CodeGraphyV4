import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { installGraphPhysicsModule } from '../src/physics/wasm/module';

export { TypedGraphLayoutEngine } from '../src/physics/engine';

export function installGeneratedGraphPhysicsForTests(): void {
  const physicsBytes = readFileSync(resolve(
    import.meta.dirname,
    '../src/wasm/generated/physics.wasm',
  ));
  installGraphPhysicsModule(new WebAssembly.Module(physicsBytes));
}
