declare module 'three' {
  export class Object3D {
    position: Vector3;
    scale: Vector3;
    add(object: Object3D): this;
  }

  export class Vector3 {
    x: number;
    y: number;
    z: number;
    set(x: number, y: number, z: number): this;
  }

  export class Group extends Object3D {}

  export class Mesh extends Object3D {
    material: Material;
    constructor(geometry: BufferGeometry, material: Material);
  }

  export class Sprite extends Object3D {
    constructor(material: SpriteMaterial);
  }

  export class BufferGeometry {
    dispose(): void;
  }

  export class SphereGeometry extends BufferGeometry {
    constructor(radius?: number, widthSegments?: number, heightSegments?: number);
  }

  export class BoxGeometry extends BufferGeometry {
    constructor(width?: number, height?: number, depth?: number);
  }

  export class OctahedronGeometry extends BufferGeometry {
    constructor(radius?: number, detail?: number);
  }

  export class ConeGeometry extends BufferGeometry {
    constructor(radius?: number, height?: number, radialSegments?: number);
  }

  export class DodecahedronGeometry extends BufferGeometry {
    constructor(radius?: number, detail?: number);
  }

  export class IcosahedronGeometry extends BufferGeometry {
    constructor(radius?: number, detail?: number);
  }

  export class Material {
    transparent: boolean;
    opacity: number;
    dispose(): void;
  }

  export class MeshLambertMaterial extends Material {
    color: Color;
    constructor(params?: { color?: string | number; transparent?: boolean });
  }

  export class SpriteMaterial extends Material {
    map: Texture | null;
    constructor(params?: { map?: Texture; transparent?: boolean });
  }

  export class Color {
    constructor(color?: string | number);
    set(color: string | number): this;
  }

  export class Texture {
    dispose(): void;
  }

  export class TextureLoader {
    load(url: string): Texture;
  }
}
