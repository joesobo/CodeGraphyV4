import type {
  BuiltInContextMenuAction,
  GraphContextMenuEntry,
} from './types';

interface BuiltInItemOptions {
  destructive?: boolean;
  shortcut?: string;
}

export function separator(id: string): GraphContextMenuEntry {
  return { kind: 'separator', id };
}

export function builtInItem(
  id: string,
  label: string,
  action: BuiltInContextMenuAction,
  options?: BuiltInItemOptions
): GraphContextMenuEntry {
  return {
    kind: 'item',
    id,
    label,
    action: { kind: 'builtin', action },
    destructive: options?.destructive,
    shortcut: options?.shortcut,
  };
}

export function pluginItem(
  id: string,
  label: string,
  pluginId: string,
  index: number,
  targetId: string,
  targetType: 'node' | 'edge'
): GraphContextMenuEntry {
  return {
    kind: 'item',
    id,
    label,
    action: {
      kind: 'plugin',
      pluginId,
      index,
      targetId,
      targetType,
    },
  };
}
