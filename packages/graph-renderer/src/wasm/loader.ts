import {
  installGraphPhysicsModule,
  graphPhysicsModuleReady,
} from '../physics/wasm/module';

let preparation: Promise<void> | undefined;

async function compileGraphPhysicsModule(): Promise<WebAssembly.Module> {
  const response = await fetch(new URL('./generated/physics.wasm', import.meta.url));
  if (!response.ok) {
    throw new Error(`Unable to load graph physics (${response.status})`);
  }
  const fallback = response.clone();
  try {
    return await WebAssembly.compileStreaming(response);
  } catch {
    return WebAssembly.compile(await fallback.arrayBuffer());
  }
}

export function prepareGraphPhysics(): Promise<void> {
  if (graphPhysicsModuleReady()) return Promise.resolve();
  preparation ??= compileGraphPhysicsModule()
    .then(module => {
      installGraphPhysicsModule(module);
    })
    .catch(error => {
      preparation = undefined;
      throw error;
    });
  return preparation;
}
