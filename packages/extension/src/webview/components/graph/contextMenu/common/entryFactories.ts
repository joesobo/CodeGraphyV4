import type {
  BuiltInContextMenuAction,
  GraphContextMenuEntry,
} from '../contracts';

interface BuiltInItemOptions {
  destructive?: boolean;
  disabled?: boolean;
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
    disabled: options?.disabled,
    shortcut: options?.shortcut,
  };
}
