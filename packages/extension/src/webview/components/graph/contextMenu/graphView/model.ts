import type { CoreGraphViewContributionSet } from '@codegraphy-dev/core';

export type GraphViewContextMenuEntry = CoreGraphViewContributionSet['contextMenu'][number];
export type GraphViewContextMenuContribution = GraphViewContextMenuEntry['contribution'];
export type GraphViewContextMenuTargetSelector = GraphViewContextMenuContribution['targets'][number];
export type GraphViewContextMenuPlacement = NonNullable<GraphViewContextMenuContribution['placement']>['menu'];
export type GraphViewContextMenuRunContext = Parameters<GraphViewContextMenuContribution['run']>[0];
