import type { IPluginContextMenuItem } from '../../../shared/types';

export type GraphContextTargetKind = 'background' | 'node' | 'edge';

export type BuiltInContextMenuAction =
  | 'open'
  | 'reveal'
  | 'copyRelative'
  | 'copyAbsolute'
  | 'copyEdgeSource'
  | 'copyEdgeTarget'
  | 'copyEdgeBoth'
  | 'toggleFavorite'
  | 'focus'
  | 'addToExclude'
  | 'rename'
  | 'delete'
  | 'refresh'
  | 'fitView'
  | 'createFile';

export type GraphContextMenuAction =
  | { kind: 'builtin'; action: BuiltInContextMenuAction }
  | { kind: 'plugin'; pluginId: string; index: number; targetId: string; targetType: 'node' | 'edge' };

export type GraphContextMenuEntry =
  | {
      kind: 'item';
      id: string;
      label: string;
      action: GraphContextMenuAction;
      destructive?: boolean;
      shortcut?: string;
    }
  | {
      kind: 'separator';
      id: string;
    };

export interface GraphContextSelection {
  kind: GraphContextTargetKind;
  targets: string[];
  edgeId?: string;
}

export interface BuildGraphContextMenuOptions {
  selection: GraphContextSelection;
  timelineActive: boolean;
  favorites: ReadonlySet<string>;
  pluginItems: readonly IPluginContextMenuItem[];
}
