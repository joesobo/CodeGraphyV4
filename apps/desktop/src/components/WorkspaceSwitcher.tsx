import { useEffect, useRef, useState } from 'react';
import type { RecentWorkspace } from '../bridge';

function workspaceName(path: string): string {
  return path.split('/').filter(Boolean).at(-1) ?? path;
}

export function WorkspaceSwitcher({
  onClearRecent,
  onOpenRecent,
  onOpenWorkspace,
  recentWorkspaces,
  workspaceRoot,
}: {
  onClearRecent: () => void;
  onOpenRecent: (path: string) => void;
  onOpenWorkspace: () => void;
  recentWorkspaces: RecentWorkspace[];
  workspaceRoot?: string;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeFromOutside = (event: PointerEvent): void => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeFromOutside);
    return () => document.removeEventListener('pointerdown', closeFromOutside);
  }, [open]);

  const focusMenuItem = (edge: 'first' | 'last'): void => {
    const items = menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
    if (!items || items.length === 0) return;
    items[edge === 'first' ? 0 : items.length - 1]?.focus();
  };

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    const items = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])];
    const index = document.activeElement instanceof HTMLButtonElement
      ? items.indexOf(document.activeElement)
      : -1;
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      focusMenuItem(event.key === 'Home' ? 'first' : 'last');
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const direction = event.key === 'ArrowDown' ? 1 : -1;
    const next = index < 0
      ? direction > 0 ? 0 : items.length - 1
      : (index + direction + items.length) % items.length;
    items[next]?.focus();
  };

  const choose = (action: () => void): void => {
    setOpen(false);
    action();
  };

  const activeName = workspaceRoot ? workspaceName(workspaceRoot) : 'No workspace';

  return (
    <div className="workspace-switcher" ref={rootRef}>
      <button
        aria-controls="workspace-menu"
        aria-expanded={open}
        aria-haspopup="menu"
        className="workspace-trigger"
        onClick={() => setOpen(current => !current)}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
          event.preventDefault();
          setOpen(true);
          requestAnimationFrame(() => focusMenuItem(event.key === 'ArrowDown' ? 'first' : 'last'));
        }}
        ref={buttonRef}
        title={workspaceRoot ?? 'Open a CodeGraphy Workspace'}
        type="button"
      >
        <span aria-hidden="true" className="workspace-trigger-icon" />
        <span className="workspace-trigger-copy">
          <span className="workspace-trigger-label">Workspace</span>
          <strong>{activeName}</strong>
        </span>
        <span aria-hidden="true" className="workspace-chevron">⌄</span>
      </button>

      {open ? (
        <div
          aria-label="Workspace menu"
          className="workspace-menu"
          id="workspace-menu"
          onKeyDown={handleMenuKeyDown}
          ref={menuRef}
          role="menu"
        >
          <button
            className="workspace-menu-primary"
            onClick={() => choose(onOpenWorkspace)}
            role="menuitem"
            type="button"
          >
            <span>Open Workspace…</span>
            <kbd>⌘O</kbd>
          </button>
          <div aria-hidden="true" className="workspace-menu-rule" />
          <p className="workspace-menu-label">Recent workspaces</p>
          {recentWorkspaces.length === 0 ? (
            <p className="workspace-menu-empty">No recent workspaces</p>
          ) : recentWorkspaces.map(recent => (
            <button
              className="recent-workspace"
              disabled={!recent.available}
              key={recent.path}
              onClick={() => choose(() => onOpenRecent(recent.path))}
              role="menuitem"
              title={recent.path}
              type="button"
            >
              <span aria-hidden="true" className={`recent-workspace-mark ${recent.available ? '' : 'is-missing'}`} />
              <span className="recent-workspace-copy">
                <strong>{recent.name}</strong>
                <span>{recent.available ? recent.path : `Missing · ${recent.path}`}</span>
              </span>
            </button>
          ))}
          <div aria-hidden="true" className="workspace-menu-rule" />
          <button
            className="workspace-menu-clear"
            disabled={recentWorkspaces.length === 0}
            onClick={() => choose(onClearRecent)}
            role="menuitem"
            type="button"
          >
            Clear recent workspaces
          </button>
        </div>
      ) : null}
    </div>
  );
}
