import type { FileTreeEntry } from './model';

export interface VisibleFileTreeItem {
  depth: number;
  entry: FileTreeEntry;
  parentPath?: string;
}

function normalizedQuery(query: string): string {
  return query.trim().toLocaleLowerCase();
}

function filterEntry(entry: FileTreeEntry, query: string): FileTreeEntry | undefined {
  const matches = entry.name.toLocaleLowerCase().includes(query)
    || entry.path.toLocaleLowerCase().includes(query);
  if (entry.kind === 'file') return matches ? entry : undefined;
  const children = entry.children
    .map(child => filterEntry(child, query))
    .filter(child => child !== undefined);
  return matches || children.length > 0 ? { ...entry, children } : undefined;
}

export function filterFileTree(entries: FileTreeEntry[], query: string): FileTreeEntry[] {
  const normalized = normalizedQuery(query);
  if (!normalized) return entries;
  return entries
    .map(entry => filterEntry(entry, normalized))
    .filter(entry => entry !== undefined);
}

export function collectFolderPaths(entries: FileTreeEntry[]): Set<string> {
  const paths = new Set<string>();
  const visit = (entry: FileTreeEntry): void => {
    if (entry.kind === 'file') return;
    paths.add(entry.path);
    for (const child of entry.children) visit(child);
  };
  for (const entry of entries) visit(entry);
  return paths;
}

export function flattenVisibleFileTree(
  entries: FileTreeEntry[],
  expandedPaths: ReadonlySet<string>,
  forceExpanded: boolean,
): VisibleFileTreeItem[] {
  const visible: VisibleFileTreeItem[] = [];
  const visit = (entry: FileTreeEntry, depth: number, parentPath?: string): void => {
    visible.push({ depth, entry, ...(parentPath ? { parentPath } : {}) });
    if (entry.kind === 'folder' && (forceExpanded || expandedPaths.has(entry.path))) {
      for (const child of entry.children) visit(child, depth + 1, entry.path);
    }
  };
  for (const entry of entries) visit(entry, 1);
  return visible;
}
