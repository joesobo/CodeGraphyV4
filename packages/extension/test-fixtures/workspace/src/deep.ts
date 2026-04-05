import { normalizeLeaf } from './leaf';

export function padLabel(value: string): string {
  return normalizeLeaf(value.trim());
}
