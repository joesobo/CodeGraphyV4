import type { BoundaryFileNode } from './types';

export function deadEnds(files: BoundaryFileNode[]): BoundaryFileNode[] {
  return files.filter((file) => file.incoming === 0 && file.outgoing === 0 && !file.entrypoint);
}

export function deadSurfaces(files: BoundaryFileNode[]): BoundaryFileNode[] {
  return files.filter((file) => file.incoming === 0 && file.outgoing > 0 && !file.entrypoint);
}
