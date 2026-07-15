import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { installOwnedGraphPhysicsModule } from '@graph-renderer/physics/wasm/module';

const physicsBytes = readFileSync(resolve(
  import.meta.dirname,
  '../src/wasm/generated/physics.wasm',
));

installOwnedGraphPhysicsModule(new WebAssembly.Module(physicsBytes));
