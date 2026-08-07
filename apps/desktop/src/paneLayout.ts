export interface PaneLayout {
  editor: number;
  files: number;
}

export interface PanePixelLayout {
  editor: number;
  files: number;
  graph: number;
}

export const DEFAULT_PANE_LAYOUT: PaneLayout = { files: 0.16, editor: 0.45 };
export const PANE_LAYOUT_STORAGE_KEY = 'codegraphy.desktop.pane-layout';
export const PANE_SEPARATOR_WIDTH = 6;
export const MIN_FILES_PANE = 180;
export const MAX_FILES_PANE = 420;
export const MIN_EDITOR_PANE = 320;
export const MIN_GRAPH_PANE = 320;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parsePaneLayout(value: unknown): PaneLayout {
  if (!isRecord(value)
    || Object.keys(value).sort().join(',') !== 'editor,files'
    || typeof value.files !== 'number'
    || !Number.isFinite(value.files)
    || typeof value.editor !== 'number'
    || !Number.isFinite(value.editor)
    || value.files <= 0
    || value.editor <= 0
    || value.files + value.editor >= 1) {
    return { ...DEFAULT_PANE_LAYOUT };
  }
  return { files: value.files, editor: value.editor };
}

export function readPaneLayout(storage: Pick<Storage, 'getItem'>): PaneLayout {
  const stored = storage.getItem(PANE_LAYOUT_STORAGE_KEY);
  if (stored === null) return { ...DEFAULT_PANE_LAYOUT };
  try {
    return parsePaneLayout(JSON.parse(stored));
  } catch {
    return { ...DEFAULT_PANE_LAYOUT };
  }
}

export function clampPaneLayout(layout: PaneLayout, containerWidth: number): PanePixelLayout {
  const usableWidth = Math.max(
    MIN_FILES_PANE + MIN_EDITOR_PANE + MIN_GRAPH_PANE,
    containerWidth - PANE_SEPARATOR_WIDTH * 2,
  );
  const files = Math.min(
    Math.min(MAX_FILES_PANE, usableWidth - MIN_EDITOR_PANE - MIN_GRAPH_PANE),
    Math.max(MIN_FILES_PANE, layout.files * usableWidth),
  );
  const editor = Math.min(
    usableWidth - files - MIN_GRAPH_PANE,
    Math.max(MIN_EDITOR_PANE, layout.editor * usableWidth),
  );
  return { files, editor, graph: usableWidth - files - editor };
}

export function paneLayoutFromPixels(
  layout: Pick<PanePixelLayout, 'files' | 'editor'>,
  containerWidth: number,
): PaneLayout {
  const usableWidth = Math.max(1, containerWidth - PANE_SEPARATOR_WIDTH * 2);
  return { files: layout.files / usableWidth, editor: layout.editor / usableWidth };
}
