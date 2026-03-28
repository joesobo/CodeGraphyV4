/**
 * Manual mock for the `three` module in jsdom tests.
 * Provides stub constructors for all Three.js classes used in the codebase.
 */
import { vi } from 'vitest';

const createMockGeometry = (name: string) =>
  vi.fn().mockImplementation((...args: number[]) => ({ type: name, args }));

export const SphereGeometry = createMockGeometry('SphereGeometry');
export const BoxGeometry = createMockGeometry('BoxGeometry');
export const OctahedronGeometry = createMockGeometry('OctahedronGeometry');
export const ConeGeometry = createMockGeometry('ConeGeometry');
export const DodecahedronGeometry = createMockGeometry('DodecahedronGeometry');
export const IcosahedronGeometry = createMockGeometry('IcosahedronGeometry');

export const MeshLambertMaterial = vi.fn().mockImplementation((opts: Record<string, unknown>) => ({
  type: 'MeshLambertMaterial',
  color: opts?.color,
  ...opts,
}));

export const SpriteMaterial = vi.fn().mockImplementation((opts: Record<string, unknown>) => ({
  type: 'SpriteMaterial',
  ...opts,
}));

export const Color = vi.fn().mockImplementation((color: string) => ({
  isColor: true,
  value: color,
  set: vi.fn(),
}));

export const TextureLoader = vi.fn().mockImplementation(() => ({
  load: vi.fn().mockReturnValue({ isTexture: true }),
}));

export const Mesh = vi.fn().mockImplementation((geometry: unknown, material: unknown) => ({
  isMesh: true,
  geometry,
  material,
}));

export const Sprite = vi.fn().mockImplementation((material: unknown) => ({
  isSprite: true,
  material,
  scale: { set: vi.fn() },
}));

export const Group = vi.fn().mockImplementation(() => ({
  isGroup: true,
  children: [] as unknown[],
  add: vi.fn(function (this: { children: unknown[] }, child: unknown) {
    this.children.push(child);
    return this;
  }),
}));
