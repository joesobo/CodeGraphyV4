import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { installOwnedGraphPhysicsModule } from '../../extension/src/webview/components/graph/rendering/surface/owned2d/physics/wasm/module';

const bytes = readFileSync(resolve(
  __dirname,
  '../../extension/src/webview/wasm/generated/owned2d-physics.wasm',
));
installOwnedGraphPhysicsModule(new WebAssembly.Module(bytes));
