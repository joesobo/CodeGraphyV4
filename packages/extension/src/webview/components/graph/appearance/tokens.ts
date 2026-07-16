import type { GraphAppearance } from './contracts';

export const GRAPH_APPEARANCE_TOKENS = {
  focusBorder: '--cg-focus-border',
  labelForeground: '--cg-graph-label-foreground',
  labelMutedForeground: '--cg-graph-label-muted-foreground',
  linkHighlight: '--cg-graph-link-highlight',
  linkMuted: '--cg-graph-link-muted',
  nodeSelectionBorder: '--cg-graph-node-selection-border',
  stageBackground: '--cg-graph-background',
  transparent: '--cg-transparent',
} satisfies Record<keyof GraphAppearance, string>;
