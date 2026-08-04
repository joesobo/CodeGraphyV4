import {
  type BuildGraphContextMenuOptions,
  type GraphContextMenuEntry,
} from '../contracts';
import { decideGraphContextMenu } from '../decision/model';
import { buildGraphViewContextMenuEntries } from '../graphView/entries';
import { buildGraphContextMenuHeader } from '../header/model';
import { separator } from '../common/entryFactories';
import { buildBaseGraphContextMenuEntries } from './baseEntries';
import { captureContextSelection, insertCreateMenuEntries } from './selectionEntries';

export function buildGraphContextMenuEntries(
  options: BuildGraphContextMenuOptions
): GraphContextMenuEntry[] {
  const {
    selection,
    favorites,
    graphViewContributions,
    workspaceName,
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
  const actionEntries = captureContextSelection([
    ...positionedBaseEntries,
    ...buildGraphViewContextMenuEntries({
      decision,
      edges,
      graphViewContributions,
      nodes,
      selection,
    }),
  ], selection);
  const header = buildGraphContextMenuHeader(selection, { edges, nodes, workspaceName });
  if (!header) return actionEntries;
  return [
    { kind: 'header', id: 'context-target-header', header },
    separator('context-target-header-separator'),
    ...actionEntries,
  ];
}
