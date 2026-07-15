let ownedGraphPhysicsModule: WebAssembly.Module | undefined;

export function installOwnedGraphPhysicsModule(module: WebAssembly.Module): void {
  ownedGraphPhysicsModule = module;
}

export function ownedGraphPhysicsModuleReady(): boolean {
  return ownedGraphPhysicsModule !== undefined;
}

export function requireOwnedGraphPhysicsModule(): WebAssembly.Module {
  if (!ownedGraphPhysicsModule) {
    throw new Error('Owned graph WASM physics module has not been prepared');
  }
  return ownedGraphPhysicsModule;
}
