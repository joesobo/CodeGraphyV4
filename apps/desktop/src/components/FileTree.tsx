import { useEffect, useRef, useState } from 'react';
import { resolveMaterialIcon, type MaterialIconData } from '../materialIconTheme';
import type { FileTreeEntry } from '../model';

function MaterialIcon({ path, mode }: { path: string; mode: 'file' | 'folder' }): React.ReactElement {
  const [icon, setIcon] = useState<MaterialIconData>();

  useEffect(() => {
    let active = true;
    void resolveMaterialIcon(path, mode)
      .then(result => { if (active) setIcon(result); })
      .catch(() => { if (active) setIcon(undefined); });
    return () => { active = false; };
  }, [mode, path]);

  return icon
    ? <img alt="" aria-hidden="true" className={`tree-material-icon tree-material-icon--${mode}`} src={icon.imageUrl} />
    : <span aria-hidden="true" className={`${mode}-mark`} />;
}

function visibleTreeItems(tree: HTMLElement): HTMLButtonElement[] {
  return [...tree.querySelectorAll<HTMLButtonElement>('[role="treeitem"]')];
}

function Entry({
  entry,
  focusedPath,
  onFocusPath,
  onSelect,
  selectedPath,
}: {
  entry: FileTreeEntry;
  focusedPath?: string;
  onFocusPath: (path: string) => void;
  onSelect: (path: string) => void;
  selectedPath?: string;
}): React.ReactElement {
  const [expanded, setExpanded] = useState(true);
  const selected = selectedPath === entry.path;

  if (entry.kind === 'file') {
    return (
      <button
        aria-selected={selected}
        className={`tree-item tree-file ${selected ? 'is-selected' : ''}`}
        data-tree-path={entry.path}
        onClick={() => onSelect(entry.path)}
        onFocus={() => onFocusPath(entry.path)}
        role="treeitem"
        tabIndex={focusedPath === entry.path ? 0 : -1}
        title={entry.path}
        type="button"
      >
        <MaterialIcon mode="file" path={entry.path} />
        <span>{entry.name}</span>
      </button>
    );
  }

  return (
    <div className={`tree-folder ${expanded ? 'is-expanded' : ''}`}>
      <button
        aria-expanded={expanded}
        className="tree-item tree-folder-button"
        data-tree-path={entry.path}
        onClick={() => setExpanded(current => !current)}
        onFocus={() => onFocusPath(entry.path)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight' && !expanded) {
            event.preventDefault();
            setExpanded(true);
          } else if (event.key === 'ArrowLeft' && expanded) {
            event.preventDefault();
            setExpanded(false);
          }
        }}
        role="treeitem"
        tabIndex={focusedPath === entry.path ? 0 : -1}
        title={entry.path}
        type="button"
      >
        <span aria-hidden="true" className="folder-caret">›</span>
        <MaterialIcon mode="folder" path={entry.path} />
        <span>{entry.name}</span>
      </button>
      {expanded ? (
        <div className="tree-children" role="group">
          {entry.children.map(child => (
            <Entry
              entry={child}
              focusedPath={focusedPath}
              key={child.path}
              onFocusPath={onFocusPath}
              onSelect={onSelect}
              selectedPath={selectedPath}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function FileTree({
  entries,
  selectedPath,
  onSelect,
}: {
  entries: FileTreeEntry[];
  selectedPath?: string;
  onSelect: (path: string) => void;
}): React.ReactElement {
  const [focusedPath, setFocusedPath] = useState<string>();
  const treeRef = useRef<HTMLDivElement>(null);
  const typeAheadRef = useRef('');
  const typeAheadTimerRef = useRef<number | undefined>(undefined);

  const activePath = focusedPath ?? selectedPath ?? entries[0]?.path;

  useEffect(() => () => {
    if (typeAheadTimerRef.current !== undefined) window.clearTimeout(typeAheadTimerRef.current);
  }, []);

  const handleTreeKeyDown = (event: React.KeyboardEvent<HTMLElement>): void => {
    const tree = treeRef.current;
    if (!tree || !(event.target instanceof HTMLButtonElement)) return;
    const items = visibleTreeItems(tree);
    const currentIndex = items.indexOf(event.target);
    if (currentIndex < 0) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const nextIndex = event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : Math.min(items.length - 1, Math.max(0, currentIndex + (event.key === 'ArrowDown' ? 1 : -1)));
      items[nextIndex]?.focus();
      return;
    }

    if (event.key === 'ArrowLeft' && event.target.getAttribute('aria-expanded') === null) {
      const parentGroup = event.target.closest('[role="group"]');
      if (parentGroup?.previousElementSibling instanceof HTMLButtonElement) {
        event.preventDefault();
        parentGroup.previousElementSibling.focus();
      }
      return;
    }

    if (event.key.length !== 1 || event.metaKey || event.ctrlKey || event.altKey) return;
    typeAheadRef.current += event.key.toLocaleLowerCase();
    if (typeAheadTimerRef.current !== undefined) window.clearTimeout(typeAheadTimerRef.current);
    typeAheadTimerRef.current = window.setTimeout(() => { typeAheadRef.current = ''; }, 650);
    const searchOrder = [...items.slice(currentIndex + 1), ...items.slice(0, currentIndex + 1)];
    searchOrder.find(item => item.textContent?.trim().toLocaleLowerCase().startsWith(typeAheadRef.current))?.focus();
  };

  return (
    <div
      aria-label="Workspace Files"
      className="file-tree"
      onKeyDown={handleTreeKeyDown}
      ref={treeRef}
      role="tree"
    >
      {entries.map(entry => (
        <Entry
          entry={entry}
          focusedPath={activePath}
          key={entry.path}
          onFocusPath={setFocusedPath}
          onSelect={onSelect}
          selectedPath={selectedPath}
        />
      ))}
    </div>
  );
}
