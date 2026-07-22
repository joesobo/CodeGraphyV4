import type { ExtensionGraphViewContributionSet } from '@codegraphy-dev/extension-plugin-api';

export type GraphViewContextMenuEntry = ExtensionGraphViewContributionSet['contextMenu'][number];
export type GraphViewContextMenuContribution = GraphViewContextMenuEntry['contribution'];
export type GraphViewContextMenuTargetSelector = GraphViewContextMenuContribution['targets'][number];
export type GraphViewContextMenuPlacement = NonNullable<GraphViewContextMenuContribution['placement']>['menu'];
export type GraphViewContextMenuRunContext = Parameters<GraphViewContextMenuContribution['run']>[0];
