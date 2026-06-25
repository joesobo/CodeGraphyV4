import {
  useRef,
  type ReactElement,
} from 'react';
import {
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from '../../../ui/context/menu';
import type { GraphContextMenuEntry } from '../../contextMenu/contracts';
import type { ViewportProps } from '../contracts';

export function ViewportContextMenuItems({
  handleMenuAction,
  menuEntries,
}: Pick<ViewportProps, 'handleMenuAction' | 'menuEntries'>): ReactElement {
  return (
    <>
      {menuEntries.map(entry => {
        if (entry.kind === 'separator') {
          return <ContextMenuSeparator key={entry.id} />;
        }

        return (
          <ViewportContextMenuItem
            key={entry.id}
            entry={entry}
            handleMenuAction={handleMenuAction}
          />
        );
      })}
    </>
  );
}

export function createMenuEntriesSignature(menuEntries: readonly GraphContextMenuEntry[]): string {
  return menuEntries
    .map(entry => entry.kind === 'separator' ? `${entry.id}:separator` : `${entry.id}:${entry.label}`)
    .join('|');
}

function ViewportContextMenuItem({
  entry,
  handleMenuAction,
}: {
  entry: Extract<GraphContextMenuEntry, { kind: 'item' }>;
  handleMenuAction: ViewportProps['handleMenuAction'];
}): ReactElement {
  const handledRef = useRef(false);
  const handleAction = (): void => {
    if (handledRef.current) {
      return;
    }

    handledRef.current = true;
    queueMicrotask(() => {
      handledRef.current = false;
    });

    if (entry.contextSelection) {
      handleMenuAction({
        action: entry.action,
        contextSelection: entry.contextSelection,
      });
    }
  };

  return (
    <ContextMenuItem
      className={entry.destructive ? 'text-[var(--cg-error-foreground)] focus:text-[var(--cg-error-foreground)]' : undefined}
      data-menu-entry-id={entry.id}
      data-menu-entry-targets={entry.contextSelection?.targets.join('\n') ?? ''}
      disabled={entry.disabled}
      onClick={handleAction}
      onSelect={handleAction}
    >
      {entry.label}
      {entry.shortcut ? <ContextMenuShortcut>{entry.shortcut}</ContextMenuShortcut> : null}
    </ContextMenuItem>
  );
}
