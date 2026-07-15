import wasmUrl from './generated/owned2d-physics.wasm?url';
import {
  installOwnedGraphPhysicsModule,
  ownedGraphPhysicsModuleReady,
} from '../components/graph/rendering/surface/owned2d/physics/wasm/module';

let preparation: Promise<void> | undefined;

async function compileOwnedGraphPhysicsModule(): Promise<WebAssembly.Module> {
  const response = await fetch(new URL(wasmUrl, import.meta.url));
  if (!response.ok) {
    throw new Error(`Unable to load owned graph physics (${response.status})`);
  }
  const fallback = response.clone();
  try {
    return await WebAssembly.compileStreaming(response);
  } catch {
    return WebAssembly.compile(await fallback.arrayBuffer());
  }
}

export function prepareOwnedGraphPhysics(): Promise<void> {
  if (ownedGraphPhysicsModuleReady()) return Promise.resolve();
  preparation ??= compileOwnedGraphPhysicsModule().then(module => {
    installOwnedGraphPhysicsModule(module);
  });
  return preparation;
}
