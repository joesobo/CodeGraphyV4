import * as THREE from 'three';
import type { NodeShape3D } from '../../../../../shared/settings/modes';

/**
 * Creates a Three.js mesh for a 3D node shape.
 */
export function createNodeMesh(shape: NodeShape3D, color: string, size: number): THREE.Mesh {
  let geometry: THREE.BufferGeometry;

  switch (shape) {
    case 'sphere':
      geometry = new THREE.SphereGeometry(size, 16, 12);
      break;
    case 'cube':
      geometry = new THREE.BoxGeometry(size * 1.6, size * 1.6, size * 1.6);
      break;
    case 'octahedron':
      geometry = new THREE.OctahedronGeometry(size);
      break;
    case 'cone':
      geometry = new THREE.ConeGeometry(size, size * 2, 16);
      break;
    case 'dodecahedron':
      geometry = new THREE.DodecahedronGeometry(size);
      break;
    case 'icosahedron':
      geometry = new THREE.IcosahedronGeometry(size);
      break;
  }

  const material = new THREE.MeshLambertMaterial({ color, transparent: true });
  return new THREE.Mesh(geometry, material);
}

/**
 * Creates a Three.js sprite from an image URL for use as a node overlay.
 */
export function createImageSprite(textureUrl: string, size: number): THREE.Sprite {
  const texture = new THREE.TextureLoader().load(textureUrl);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  // Disable depth test so the sprite renders on top of the mesh.
  (material as unknown as { depthTest: boolean }).depthTest = false;
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(size, size, 1);
  // Ensure sprite draws after opaque meshes.
  (sprite as unknown as { renderOrder: number }).renderOrder = 1;
  return sprite;
}
