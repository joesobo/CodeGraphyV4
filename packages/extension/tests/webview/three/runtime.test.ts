import { afterEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { ensureThreeRuntimeCompatibility } from '../../../src/webview/three/runtime';

type ThreeWindow = Window & {
  THREE?: Record<string, unknown>;
};

const threeExports = THREE as unknown as Record<string, unknown>;

describe('webview/three/runtime', () => {
  const originalThree = (window as ThreeWindow).THREE;

  afterEach(() => {
    if (originalThree) {
      (window as ThreeWindow).THREE = originalThree;
      return;
    }

    delete (window as ThreeWindow).THREE;
  });

  it('fills in missing three exports on an existing global namespace', () => {
    (window as ThreeWindow).THREE = {
      Clock: threeExports.Clock,
    };

    ensureThreeRuntimeCompatibility(window as unknown as typeof globalThis & {
      THREE?: Record<string, unknown>;
    });

    expect((window as ThreeWindow).THREE?.Timer).toBe(threeExports.Timer);
    expect((window as ThreeWindow).THREE?.Vector3).toBe(threeExports.Vector3);
    expect((window as ThreeWindow).THREE?.Clock).toBe(threeExports.Clock);
  });

  it('leaves the runtime alone when no global THREE namespace exists', () => {
    delete (window as ThreeWindow).THREE;

    expect(() => ensureThreeRuntimeCompatibility(window as unknown as typeof globalThis)).not.toThrow();
    expect((window as ThreeWindow).THREE).toBeUndefined();
  });
});
