let graphPhysicsModule: WebAssembly.Module | undefined;

export function installGraphPhysicsModule(module: WebAssembly.Module): void {
  graphPhysicsModule = module;
}

export function graphPhysicsModuleReady(): boolean {
  return graphPhysicsModule !== undefined;
}

export function requireGraphPhysicsModule(): WebAssembly.Module {
  if (!graphPhysicsModule) {
    throw new Error('Graph WASM physics module has not been prepared');
  }
  return graphPhysicsModule;
}
