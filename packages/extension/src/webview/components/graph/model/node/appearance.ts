import type { IGraphNode } from '../../../../../shared/graph/contracts';
import type { GraphAppearance } from '../../appearance/model';
import { FALLBACK_MUTED_NODE_COLOR, FAVORITE_BORDER_COLOR } from './display';

function parseHexColor(color: string): [number, number, number] | undefined {
  const match = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (!match) return undefined;
  const value = match[1];
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
}

function toHexChannel(value: number): string {
  return Math.round(value).toString(16).padStart(2, '0');
}

function mixHexColors(source: string, target: string, amount: number): string {
  const sourceRgb = parseHexColor(source);
  const targetRgb = parseHexColor(target) ?? parseHexColor(FALLBACK_MUTED_NODE_COLOR);
  if (!sourceRgb || !targetRgb) return source;
  const mixed = sourceRgb.map((channel, index) =>
    channel + (targetRgb[index] - channel) * amount
  );
  return `#${mixed.map(toHexChannel).join('')}`;
}

export function graphNodeDisplayColor(
  node: IGraphNode,
  nodeColor: string,
  appearance: Pick<GraphAppearance, 'labelMutedForeground'>,
): string {
  return node.metadata?.gitIgnored === true
    ? mixHexColors(nodeColor, appearance.labelMutedForeground, 0.72)
    : nodeColor;
}

export function graphNodeBorderColor({
  appearance,
  isFavorite,
  isFocused,
  nodeColor,
}: {
  appearance: Pick<GraphAppearance, 'focusBorder'>;
  isFavorite: boolean;
  isFocused: boolean;
  nodeColor: string;
}): string {
  if (isFocused) return appearance.focusBorder;
  return isFavorite ? FAVORITE_BORDER_COLOR : nodeColor;
}

export function graphNodeBorderWidth(isFocused: boolean, isFavorite: boolean): number {
  if (isFocused) return 4;
  return isFavorite ? 3 : 2;
}
