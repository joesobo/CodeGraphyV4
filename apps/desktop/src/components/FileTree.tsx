import { useEffect, useMemo, useRef, useState } from 'react';
import {
  collectFolderPaths,
  filterFileTree,
  flattenVisibleFileTree,
} from '../fileTreeModel';
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

function treeItems(tree: HTMLElement): HTMLButtonElement[] {
  return [...tree.querySelectorAll<HTMLButtonElement>('[role="treeitem"]')];
}

function Entry({
  entry,
  expandedPaths,
  filterActive,
  focusedPath,
  onFocusPath,
  onSelect,
  onToggle,
  selectedPath,
}: {
  entry: FileTreeEntry;
  expandedPaths: ReadonlySet<string>;
  filterActive: boolean;
  focusedPath?: string;
  onFocusPath: (path: string) => void;
  onSelect: (path: string) => void;
  onToggle: (path: string) => void;
  selectedPath?: string;
}): React.ReactElement {
  const selected = selectedPath === entry.path;

  if (entry.kind === 'file') {
    return (
      <button
        aria-selected={selected}
        className={`tree-item tree-file ${selected ? 'is-selected' : ''}`}
        data-tree-kind="file"
        data-tree-label={entry.name}
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

  const expanded = filterActive || expandedPaths.has(entry.path);
  return (
    <div className={`tree-folder ${expanded ? 'is-expanded' : ''}`}>
      <button
        aria-expanded={expanded}
        className="tree-item tree-folder-button"
        data-tree-kind="folder"
        data-tree-label={entry.name}
        data-tree-path={entry.path}
        onClick={() => onToggle(entry.path)}
        onFocus={() => onFocusPath(entry.path)}
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
              expandedPaths={expandedPaths}
              filterActive={filterActive}
              focusedPath={focusedPath}
              key={child.path}
              onFocusPath={onFocusPath}
              onSelect={onSelect}
              onToggle={onToggle}
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
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(() => new Set());
  const [filter, setFilter] = useState('');
  const [focusedPath, setFocusedPath] = useState<string>();
  const browserRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLInputElement>(null);
  const treeRef = useRef<HTMLDivElement>(null);
  const scrollFrameRef = useRef<number>();
  const typeAheadRef = useRef('');
  const typeAheadTimerRef = useRef<number>();
  const expandedPaths = useMemo(() => {
    const paths = collectFolderPaths(entries);
    for (const path of collapsedPaths) paths.delete(path);
    return paths;
  }, [collapsedPaths, entries]);
  const projectedEntries = useMemo(() => filterFileTree(entries, filter), [entries, filter]);
  const filterActive = filter.trim().length > 0;
  const allPaths = useMemo(
    () => flattenVisibleFileTree(entries, expandedPaths, true).map(row => row.entry.path),
    [entries, expandedPaths],
  );
  const visibleRows = useMemo(
    () => flattenVisibleFileTree(projectedEntries, expandedPaths, filterActive),
    [expandedPaths, filterActive, projectedEntries],
  );
  const visiblePaths = visibleRows.map(row => row.entry.path);
  const activePath = focusedPath && visiblePaths.includes(focusedPath)
    ? focusedPath
    : selectedPath && visiblePaths.includes(selectedPath)
      ? selectedPath
      : visiblePaths[0];
  const restorePath = focusedPath && allPaths.includes(focusedPath)
    ? focusedPath
    : selectedPath && allPaths.includes(selectedPath)
      ? selectedPath
      : allPaths[0];

  useEffect(() => () => {
    if (scrollFrameRef.current !== undefined) cancelAnimationFrame(scrollFrameRef.current);
    if (typeAheadTimerRef.current !== undefined) window.clearTimeout(typeAheadTimerRef.current);
  }, []);

  const focusPath = (path: string | undefined): void => {
    if (!path) return;
    setFocusedPath(path);
    const findTarget = (): HTMLButtonElement | undefined => treeItems(
      treeRef.current ?? browserRef.current ?? document.body,
    ).find(item => item.dataset.treePath === path);
    findTarget()?.focus();
    if (scrollFrameRef.current !== undefined) cancelAnimationFrame(scrollFrameRef.current);
    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = undefined;
      const target = findTarget();
      if (document.activeElement?.closest('[role="tree"]') !== treeRef.current) target?.focus();
      target?.scrollIntoView?.({ block: 'nearest' });
    });
  };

  const focusAndOpenItem = (item: HTMLButtonElement | undefined): void => {
    const path = item?.dataset.treePath;
    focusPath(path);
    if (path && item?.dataset.treeKind === 'file' && path !== selectedPath) onSelect(path);
  };

  const togglePath = (path: string): void => {
    if (filterActive) return;
    setCollapsedPaths(current => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const focusTreeFromFilter = (): void => {
    focusPath(activePath);
  };

  const clearFilterAndRestoreFocus = (): void => {
    setFilter('');
    focusPath(restorePath);
  };

  const handleTreeKeyDown = (event: React.KeyboardEvent<HTMLElement>): void => {
    const tree = treeRef.current;
    if (!tree || !(event.target instanceof HTMLButtonElement)) return;
    const items = treeItems(tree);
    const currentIndex = items.indexOf(event.target);
    if (currentIndex < 0) return;

    if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === 'f') {
      event.preventDefault();
      filterRef.current?.focus();
      filterRef.current?.select();
      return;
    }
    if (event.key === '/') {
      event.preventDefault();
      filterRef.current?.focus();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const nextIndex = event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : Math.min(items.length - 1, Math.max(0, currentIndex + (event.key === 'ArrowDown' ? 1 : -1)));
      focusAndOpenItem(items[nextIndex]);
      return;
    }

    const expanded = event.target.getAttribute('aria-expanded');
    if (event.key === 'ArrowRight' && expanded !== null) {
      event.preventDefault();
      if (expanded === 'false') togglePath(event.target.dataset.treePath ?? '');
      else if (visibleRows[currentIndex + 1]?.depth === (visibleRows[currentIndex]?.depth ?? 0) + 1) {
        focusAndOpenItem(items[currentIndex + 1]);
      }
      return;
    }
    if (event.key === 'ArrowLeft') {
      if (expanded === 'true') {
        event.preventDefault();
        togglePath(event.target.dataset.treePath ?? '');
        return;
      }
      const row = visibleRows[currentIndex];
      if (row?.parentPath) {
        event.preventDefault();
        focusPath(row.parentPath);
      }
      return;
    }

    if (event.key.length !== 1 || event.key === ' ' || event.metaKey || event.ctrlKey || event.altKey) return;
    typeAheadRef.current += event.key.toLocaleLowerCase();
    if (typeAheadTimerRef.current !== undefined) window.clearTimeout(typeAheadTimerRef.current);
    typeAheadTimerRef.current = window.setTimeout(() => { typeAheadRef.current = ''; }, 650);
    const searchOrder = [...items.slice(currentIndex + 1), ...items.slice(0, currentIndex + 1)];
    const match = searchOrder.find(item => item.dataset.treeLabel?.toLocaleLowerCase().startsWith(typeAheadRef.current));
    focusPath(match?.dataset.treePath);
  };

  return (
    <div className="file-browser" ref={browserRef}>
      <label className="file-filter">
        <span aria-hidden="true" className="file-filter-icon">⌕</span>
        <input
          aria-label="Filter Files and Folders"
          onChange={event => setFilter(event.currentTarget.value)}
          onKeyDownCapture={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              focusTreeFromFilter();
            } else if (event.key === 'Escape') {
              event.preventDefault();
              clearFilterAndRestoreFocus();
            }
          }}
          onKeyUp={(event) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            clearFilterAndRestoreFocus();
          }}
          inputMode="search"
          placeholder="Filter Files and Folders"
          ref={filterRef}
          role="searchbox"
          type="text"
          value={filter}
        />
        <kbd>⌘F</kbd>
      </label>
      {visibleRows.length > 0 ? (
        <div
          aria-label="Workspace Files"
          className="file-tree"
          onKeyDown={handleTreeKeyDown}
          ref={treeRef}
          role="tree"
        >
          {projectedEntries.map(entry => (
            <Entry
              entry={entry}
              expandedPaths={expandedPaths}
              filterActive={filterActive}
              focusedPath={activePath}
              key={entry.path}
              onFocusPath={setFocusedPath}
              onSelect={onSelect}
              onToggle={togglePath}
              selectedPath={selectedPath}
            />
          ))}
        </div>
      ) : (
        <p className="file-filter-empty" role="status">No Files or Folders match “{filter.trim()}”.</p>
      )}
    </div>
  );
}
