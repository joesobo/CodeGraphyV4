import {
  installOwnedGraphPhysicsModule,
  ownedGraphPhysicsModuleReady,
} from '../physics/wasm/module';

let preparation: Promise<void> | undefined;

async function compileOwnedGraphPhysicsModule(): Promise<WebAssembly.Module> {
  const response = await fetch(new URL('./generated/physics.wasm', import.meta.url));
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

export function prepareGraphPhysics(): Promise<void> {
  if (ownedGraphPhysicsModuleReady()) return Promise.resolve();
  preparation ??= compileOwnedGraphPhysicsModule()
    .then(module => {
      installOwnedGraphPhysicsModule(module);
    })
    .catch(error => {
      preparation = undefined;
      throw error;
    });
  return preparation;
}
