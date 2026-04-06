import * as THREE from 'three';

type ThreeNamespace = Record<string, unknown>;
type ThreeGlobal = typeof globalThis & {
  THREE?: ThreeNamespace;
};

const THREE_EXPORT_ENTRIES = Object.entries(THREE) as Array<[string, unknown]>;

export function ensureThreeRuntimeCompatibility(
  globalObject: ThreeGlobal = globalThis as ThreeGlobal,
): void {
  const existingThree = globalObject.THREE;
  if (!existingThree) {
    return;
  }

  for (const [key, value] of THREE_EXPORT_ENTRIES) {
    if (!(key in existingThree)) {
      existingThree[key] = value;
    }
  }
}

ensureThreeRuntimeCompatibility();
