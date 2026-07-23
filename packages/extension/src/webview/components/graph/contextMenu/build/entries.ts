import {
  type BuildGraphContextMenuOptions,
  type GraphContextMenuEntry,
} from '../contracts';
import { decideGraphContextMenu } from '../decision/model';
import { buildGraphViewContextMenuEntries } from '../graphView/entries';
import { buildBaseGraphContextMenuEntries } from './baseEntries';
import { captureContextSelection, insertCreateMenuEntries } from './selectionEntries';

export function buildGraphContextMenuEntries(
  options: BuildGraphContextMenuOptions
): GraphContextMenuEntry[] {
  const {
    selection,
    favorites,
    graphViewContributions,
    nodes,
    edges,
  } = options;
  const decision = decideGraphContextMenu(selection, nodes);
  const baseEntries = buildBaseGraphContextMenuEntries(decision, { favorites });
  const graphViewCreateEntries = decision.kind === 'background'
    ? buildGraphViewContextMenuEntries({
      decision,
      edges,
      graphViewContributions,
      includeSeparator: false,
      nodes,
      placement: 'create',
      selection,
    })
    : [];
  const positionedBaseEntries = insertCreateMenuEntries(baseEntries, graphViewCreateEntries);
  return captureContextSelection([
    ...positionedBaseEntries,
    ...buildGraphViewContextMenuEntries({
      decision,
      edges,
      graphViewContributions,
      nodes,
      selection,
    }),
  ], selection);
}
