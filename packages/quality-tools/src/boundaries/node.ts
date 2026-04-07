import { matchesGlob } from 'path';
import type { BoundaryFileNode, BoundaryLayerRule } from './types';

function layerForPath(
  packageRelativePath: string,
  layers: BoundaryLayerRule[]
): BoundaryLayerRule | undefined {
  return layers.find((layer) => layer.include.some((pattern) => matchesGlob(packageRelativePath, pattern)));
}

function isEntrypoint(packageRelativePath: string, entrypoints: string[]): boolean {
  return entrypoints.some((pattern) => matchesGlob(packageRelativePath, pattern));
}

export function createNode(
  absolutePath: string,
  packageName: string,
  packageRelativePath: string,
  relativePath: string,
  layers: BoundaryLayerRule[],
  entrypoints: string[]
): BoundaryFileNode {
  const layer = layerForPath(packageRelativePath, layers);

  return {
    absolutePath,
    entrypoint: isEntrypoint(packageRelativePath, entrypoints),
    incoming: 0,
    layer: layer?.name,
    outgoing: 0,
    packageName,
    packageRelativePath,
    relativePath
  };
}
