import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NodeShape3D } from '../../../src/shared/types';

const mockTexture = { isTexture: true };

vi.mock('three', () => {
  const createMockGeometry = (name: string) =>
    vi.fn().mockImplementation((...args: number[]) => ({ type: name, args }));

  return {
    SphereGeometry: createMockGeometry('SphereGeometry'),
    BoxGeometry: createMockGeometry('BoxGeometry'),
    OctahedronGeometry: createMockGeometry('OctahedronGeometry'),
    ConeGeometry: createMockGeometry('ConeGeometry'),
    DodecahedronGeometry: createMockGeometry('DodecahedronGeometry'),
    IcosahedronGeometry: createMockGeometry('IcosahedronGeometry'),
    MeshLambertMaterial: vi.fn().mockImplementation((opts: Record<string, unknown>) => ({
      type: 'MeshLambertMaterial',
      ...opts,
    })),
    SpriteMaterial: vi.fn().mockImplementation((opts: Record<string, unknown>) => ({
      type: 'SpriteMaterial',
      ...opts,
    })),
    Mesh: vi.fn().mockImplementation((geometry: unknown, material: unknown) => ({
      isMesh: true,
      geometry,
      material,
    })),
    Sprite: vi.fn().mockImplementation((material: unknown) => ({
      isSprite: true,
      material,
      scale: { set: vi.fn() },
    })),
    TextureLoader: vi.fn().mockImplementation(() => ({
      load: vi.fn().mockReturnValue(mockTexture),
    })),
  };
});

import * as THREE from 'three';
import { createNodeMesh, createImageSprite } from '../../../../src/webview/components/graph/rendering/shapes3D';

const MockSphereGeometry = vi.mocked(THREE.SphereGeometry);
const MockBoxGeometry = vi.mocked(THREE.BoxGeometry);
const MockOctahedronGeometry = vi.mocked(THREE.OctahedronGeometry);
const MockConeGeometry = vi.mocked(THREE.ConeGeometry);
const MockDodecahedronGeometry = vi.mocked(THREE.DodecahedronGeometry);
const MockIcosahedronGeometry = vi.mocked(THREE.IcosahedronGeometry);
const MockMeshLambertMaterial = vi.mocked(THREE.MeshLambertMaterial);
const MockSpriteMaterial = vi.mocked(THREE.SpriteMaterial);
const MockMesh = vi.mocked(THREE.Mesh);
const MockTextureLoader = vi.mocked(THREE.TextureLoader);

describe('shapes3D', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createNodeMesh', () => {
    const allShapes: NodeShape3D[] = [
      'sphere',
      'cube',
      'octahedron',
      'cone',
      'dodecahedron',
      'icosahedron',
    ];

    it.each(allShapes)('returns a Mesh for shape "%s"', (shape) => {
      const result = createNodeMesh(shape, '#ff0000', 5);
      expect(result).toBeDefined();
      expect(result.isMesh).toBe(true);
    });

    it('creates SphereGeometry for "sphere"', () => {
      createNodeMesh('sphere', '#ff0000', 5);
      expect(MockSphereGeometry).toHaveBeenCalledOnce();
      expect(MockSphereGeometry).toHaveBeenCalledWith(5, 16, 12);
    });

    it('creates BoxGeometry for "cube" scaled by 1.6', () => {
      createNodeMesh('cube', '#00ff00', 4);
      expect(MockBoxGeometry).toHaveBeenCalledOnce();
      const scaledSize = 4 * 1.6;
      expect(MockBoxGeometry).toHaveBeenCalledWith(scaledSize, scaledSize, scaledSize);
    });

    it('creates OctahedronGeometry for "octahedron"', () => {
      createNodeMesh('octahedron', '#0000ff', 3);
      expect(MockOctahedronGeometry).toHaveBeenCalledOnce();
      expect(MockOctahedronGeometry).toHaveBeenCalledWith(3);
    });

    it('creates ConeGeometry for "cone"', () => {
      createNodeMesh('cone', '#ff00ff', 6);
      expect(MockConeGeometry).toHaveBeenCalledOnce();
      expect(MockConeGeometry).toHaveBeenCalledWith(6, 12, 16);
    });

    it('creates DodecahedronGeometry for "dodecahedron"', () => {
      createNodeMesh('dodecahedron', '#00ffff', 7);
      expect(MockDodecahedronGeometry).toHaveBeenCalledOnce();
      expect(MockDodecahedronGeometry).toHaveBeenCalledWith(7);
    });

    it('creates IcosahedronGeometry for "icosahedron"', () => {
      createNodeMesh('icosahedron', '#ffff00', 8);
      expect(MockIcosahedronGeometry).toHaveBeenCalledOnce();
      expect(MockIcosahedronGeometry).toHaveBeenCalledWith(8);
    });

    it('each shape type uses a different geometry constructor', () => {
      const constructorMap: Record<NodeShape3D, ReturnType<typeof vi.fn>> = {
        sphere: MockSphereGeometry,
        cube: MockBoxGeometry,
        octahedron: MockOctahedronGeometry,
        cone: MockConeGeometry,
        dodecahedron: MockDodecahedronGeometry,
        icosahedron: MockIcosahedronGeometry,
      };

      for (const shape of allShapes) {
        vi.clearAllMocks();
        createNodeMesh(shape, '#fff', 5);

        // The expected constructor should have been called
        expect(constructorMap[shape]).toHaveBeenCalledOnce();

        // All other constructors should NOT have been called
        for (const otherShape of allShapes) {
          if (otherShape !== shape) {
            expect(constructorMap[otherShape]).not.toHaveBeenCalled();
          }
        }
      }
    });

    it('passes color to MeshLambertMaterial', () => {
      createNodeMesh('sphere', '#abcdef', 5);
      expect(MockMeshLambertMaterial).toHaveBeenCalledWith({
        color: '#abcdef',
        transparent: true,
      });
    });

    it('constructs Mesh with geometry and material', () => {
      createNodeMesh('sphere', '#fff', 5);
      expect(MockMesh).toHaveBeenCalledOnce();
      // First arg should be the geometry instance, second the material instance
      const [geometry, material] = MockMesh.mock.calls[0];
      expect(geometry).toHaveProperty('type', 'SphereGeometry');
      expect(material).toHaveProperty('type', 'MeshLambertMaterial');
    });

    it('passes size through for sphere radius', () => {
      createNodeMesh('sphere', '#fff', 12);
      expect(MockSphereGeometry).toHaveBeenCalledWith(12, 16, 12);
    });

    it('passes size through for octahedron radius', () => {
      createNodeMesh('octahedron', '#fff', 9);
      expect(MockOctahedronGeometry).toHaveBeenCalledWith(9);
    });
  });

  describe('createImageSprite', () => {
    it('returns a Sprite', () => {
      const result = createImageSprite('https://example.com/image.png', 10);
      expect(result).toBeDefined();
      expect(result.isSprite).toBe(true);
    });

    it('loads the texture from the given URL', () => {
      createImageSprite('https://example.com/icon.png', 5);
      const loaderInstance = MockTextureLoader.mock.results[0].value;
      expect(loaderInstance.load).toHaveBeenCalledWith('https://example.com/icon.png');
    });

    it('creates SpriteMaterial with the loaded texture', () => {
      createImageSprite('https://example.com/icon.png', 5);
      expect(MockSpriteMaterial).toHaveBeenCalledWith({
        map: mockTexture,
        transparent: true,
      });
    });

    it('disables depthTest on sprite material so it renders on top', () => {
      createImageSprite('https://example.com/icon.png', 5);
      const materialInstance = MockSpriteMaterial.mock.results[0].value;
      expect(materialInstance.depthTest).toBe(false);
    });

    it('sets renderOrder to 1 so sprite renders on top of mesh', () => {
      const sprite = createImageSprite('https://example.com/icon.png', 5);
      expect(sprite.renderOrder).toBe(1);
    });

    it('sets scale based on size parameter', () => {
      const sprite = createImageSprite('https://example.com/icon.png', 8);
      expect(sprite.scale.set).toHaveBeenCalledWith(8, 8, 1);
    });

    it('passes different sizes correctly', () => {
      const sprite = createImageSprite('https://example.com/icon.png', 15);
      expect(sprite.scale.set).toHaveBeenCalledWith(15, 15, 1);
    });
  });
});
