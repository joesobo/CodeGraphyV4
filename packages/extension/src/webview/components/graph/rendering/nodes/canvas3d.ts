import * as THREE from 'three';
import SpriteText from 'three-spritetext';
import { createImageSprite, createNodeMesh } from '../shapes/draw/threeDimensional';
import { DEFAULT_NODE_SIZE, type FGNode } from '../../model/build';
import { setSpriteVisible } from '../../support/contracts/forceGraph';
import { DEFAULT_GRAPH_APPEARANCE, type GraphAppearance } from '../../appearance/model';

interface GraphRef<TValue> {
  current: TValue;
}

export interface NodeThreeObjectDependencies {
  meshesRef: GraphRef<Map<string, THREE.Mesh>>;
  graphAppearanceRef?: GraphRef<Pick<GraphAppearance, 'labelForeground'>>;
  showLabelsRef: GraphRef<boolean>;
  spritesRef: GraphRef<Map<string, SpriteText>>;
}

interface CachedNodeThreeObject {
  object: THREE.Object3D;
  signature: string;
}

const objectsByGraph = new WeakMap<object, WeakMap<FGNode, CachedNodeThreeObject>>();

export function createNodeThreeObject(
  dependencies: NodeThreeObjectDependencies,
  node: FGNode,
): THREE.Object3D {
  const signature = getNodeThreeObjectSignature(dependencies, node);
  const graphObjects = getGraphObjectCache(dependencies.meshesRef);
  const cached = graphObjects.get(node);
  if (cached?.signature === signature) {
    const sprite = dependencies.spritesRef.current.get(node.id);
    if (sprite) {
      setSpriteVisible(sprite, dependencies.showLabelsRef.current);
      sprite.color = getLabelColor(dependencies);
    }
    return cached.object;
  }

  const group = new THREE.Group();

  if (shouldRenderNodeMesh(node)) {
    const shape = node.shape3D ?? 'sphere';
    const mesh = createNodeMesh(shape, node.color, node.size / DEFAULT_NODE_SIZE * 4);
    dependencies.meshesRef.current.set(node.id, mesh);
    group.add(mesh);
  }

  if (node.imageUrl) {
    const imageSprite = createImageSprite(node.imageUrl, node.size / DEFAULT_NODE_SIZE * 6);
    group.add(imageSprite);
  }

  const sprite = new SpriteText(node.label);
  setSpriteVisible(sprite, dependencies.showLabelsRef.current);
  sprite.color = getLabelColor(dependencies);
  sprite.textHeight = 6;
  sprite.offsetY = (node.size / DEFAULT_NODE_SIZE) * 8 + 4;
  dependencies.spritesRef.current.set(node.id, sprite);
  group.add(sprite);

  graphObjects.set(node, { object: group, signature });

  return group;
}

function getGraphObjectCache(
  graphIdentity: object,
): WeakMap<FGNode, CachedNodeThreeObject> {
  const existing = objectsByGraph.get(graphIdentity);
  if (existing) return existing;

  const created = new WeakMap<FGNode, CachedNodeThreeObject>();
  objectsByGraph.set(graphIdentity, created);
  return created;
}

function getNodeThreeObjectSignature(
  dependencies: NodeThreeObjectDependencies,
  node: FGNode,
): string {
  return JSON.stringify([
    node.color,
    node.imageUrl,
    node.label,
    node.nodeType,
    node.shape3D,
    node.size,
    getLabelColor(dependencies),
  ]);
}

function getLabelColor(dependencies: NodeThreeObjectDependencies): string {
  return dependencies.graphAppearanceRef?.current.labelForeground
    ?? DEFAULT_GRAPH_APPEARANCE.labelForeground;
}

function shouldRenderNodeMesh(node: FGNode): boolean {
  return node.nodeType !== 'folder' || !node.imageUrl;
}
