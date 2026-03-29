import * as THREE from 'three';
import SpriteText from 'three-spritetext';
import { createImageSprite, createNodeMesh } from '../shapes/draw3d';
import { DEFAULT_NODE_SIZE, type FGNode } from '../../model/build';
import { setSpriteVisible } from '../../support/contracts';

interface GraphRef<TValue> {
  current: TValue;
}

export interface NodeThreeObjectDependencies {
  meshesRef: GraphRef<Map<string, THREE.Mesh>>;
  showLabelsRef: GraphRef<boolean>;
  spritesRef: GraphRef<Map<string, SpriteText>>;
}

export function createNodeThreeObject(
  dependencies: NodeThreeObjectDependencies,
  node: FGNode,
): THREE.Object3D {
  const group = new THREE.Group();

  const shape = node.shape3D ?? 'sphere';
  const mesh = createNodeMesh(shape, node.color, node.size / DEFAULT_NODE_SIZE * 4);
  dependencies.meshesRef.current.set(node.id, mesh);
  group.add(mesh);

  if (node.imageUrl) {
    const imageSprite = createImageSprite(node.imageUrl, node.size / DEFAULT_NODE_SIZE * 6);
    group.add(imageSprite);
  }

  const sprite = new SpriteText(node.label);
  setSpriteVisible(sprite, dependencies.showLabelsRef.current);
  sprite.color = '#ffffff';
  sprite.textHeight = 6;
  sprite.offsetY = (node.size / DEFAULT_NODE_SIZE) * 8 + 4;
  dependencies.spritesRef.current.set(node.id, sprite);
  group.add(sprite);

  return group;
}
