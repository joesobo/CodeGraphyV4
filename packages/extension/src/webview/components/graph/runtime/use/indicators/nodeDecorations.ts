import { useEffect, type MutableRefObject } from 'react';
import type * as THREE from 'three';
import type SpriteText from 'three-spritetext';
import type { NodeDecorationPayload } from '../../../../../../shared/plugins/decorations';
import type { FGNode } from '../../../model/build';

export function applyNodeDecorationIndicators(options: {
  decorations: Record<string, NodeDecorationPayload>;
  graphNodes: readonly FGNode[];
  meshes: ReadonlyMap<string, THREE.Mesh>;
  sprites: ReadonlyMap<string, SpriteText>;
}): void {
  const nodesById = new Map(options.graphNodes.map(node => [node.id, node]));
  for (const [nodeId, mesh] of options.meshes) {
    const material = mesh.material as THREE.Material & {
      emissive: { set(color: string): void };
      emissiveIntensity: number;
    };
    const borderColor = options.decorations[nodeId]?.border?.color;
    material.emissive.set(borderColor ?? '#000000');
    material.emissiveIntensity = borderColor ? 0.9 : 0;
  }

  for (const [nodeId, sprite] of options.sprites) {
    const node = nodesById.get(nodeId);
    if (!node) continue;
    const badgeText = options.decorations[nodeId]?.badge?.text;
    sprite.text = badgeText ? `${node.label}  [${badgeText}]` : node.label;
  }
}

export function useNodeDecorationIndicators(options: {
  decorations: Record<string, NodeDecorationPayload>;
  fg2dRef: MutableRefObject<{ zoom?(): number; zoom?(scale: number, durationMs?: number): void } | undefined>;
  graphMode: '2d' | '3d';
  graphNodes: readonly FGNode[];
  meshesRef: MutableRefObject<Map<string, THREE.Mesh>>;
  spritesRef: MutableRefObject<Map<string, SpriteText>>;
}): void {
  useEffect(() => {
    if (options.graphMode === '2d') {
      const scale = options.fg2dRef.current?.zoom?.();
      if (scale !== undefined) options.fg2dRef.current?.zoom?.(scale, 0);
      return;
    }

    applyNodeDecorationIndicators({
      decorations: options.decorations,
      graphNodes: options.graphNodes,
      meshes: options.meshesRef.current,
      sprites: options.spritesRef.current,
    });
  }, [options.decorations, options.fg2dRef, options.graphMode, options.graphNodes, options.meshesRef, options.spritesRef]);
}
