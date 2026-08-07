import { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_PANE_LAYOUT,
  MAX_FILES_PANE,
  MIN_EDITOR_PANE,
  MIN_FILES_PANE,
  MIN_GRAPH_PANE,
  PANE_LAYOUT_STORAGE_KEY,
  PANE_SEPARATOR_WIDTH,
  clampPaneLayout,
  paneLayoutFromPixels,
  readPaneLayout,
  type PaneLayout,
  type PanePixelLayout,
} from '../paneLayout';

type SeparatorKind = 'files' | 'graph';

interface PaneDrag {
  kind: SeparatorKind;
  layout: PanePixelLayout;
  pointerId: number;
  startX: number;
}

function savePaneLayout(layout: PaneLayout): void {
  try {
    window.localStorage.setItem(PANE_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // The current layout remains usable when the webview denies local persistence.
  }
}

export function WorkspacePanes({
  editorPane,
  filesPane,
  graphPane,
}: {
  editorPane: React.ReactNode;
  filesPane: React.ReactNode;
  graphPane: React.ReactNode;
}): React.ReactElement {
  const [containerWidth, setContainerWidth] = useState(() => window.innerWidth);
  const [layout, setLayout] = useState(() => readPaneLayout(window.localStorage));
  const [activeSeparator, setActiveSeparator] = useState<SeparatorKind>();
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<PaneDrag>();
  const layoutRef = useRef(layout);
  const pixels = clampPaneLayout(layout, containerWidth);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const measure = (): void => setContainerWidth(container.clientWidth);
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(container);
    return () => resize.disconnect();
  }, []);

  const updateFromPixels = (next: Pick<PanePixelLayout, 'files' | 'editor'>): void => {
    const normalized = clampPaneLayout(paneLayoutFromPixels(next, containerWidth), containerWidth);
    const nextLayout = paneLayoutFromPixels(normalized, containerWidth);
    layoutRef.current = nextLayout;
    setLayout(nextLayout);
  };

  const commitLayout = (): void => savePaneLayout(layoutRef.current);

  const resetLayout = (): void => {
    const nextLayout = { ...DEFAULT_PANE_LAYOUT };
    layoutRef.current = nextLayout;
    setLayout(nextLayout);
    savePaneLayout(DEFAULT_PANE_LAYOUT);
  };

  const resizeBy = (kind: SeparatorKind, delta: number): void => {
    if (kind === 'files') {
      updateFromPixels({ files: pixels.files + delta, editor: pixels.editor - delta });
    } else {
      updateFromPixels({ files: pixels.files, editor: pixels.editor + delta });
    }
  };

  const resizeToEdge = (kind: SeparatorKind, edge: 'minimum' | 'maximum'): void => {
    if (kind === 'files') {
      const files = edge === 'minimum'
        ? MIN_FILES_PANE
        : Math.min(MAX_FILES_PANE, pixels.files + pixels.editor - MIN_EDITOR_PANE);
      updateFromPixels({ files, editor: pixels.editor + pixels.files - files });
    } else {
      const editor = edge === 'minimum'
        ? MIN_EDITOR_PANE
        : pixels.editor + pixels.graph - MIN_GRAPH_PANE;
      updateFromPixels({ files: pixels.files, editor });
    }
  };

  const separator = (kind: SeparatorKind, label: string): React.ReactElement => {
    const value = kind === 'files' ? pixels.files : pixels.files + pixels.editor;
    return (
      <div
        aria-label={label}
        aria-orientation="vertical"
        aria-valuemax={kind === 'files'
          ? Math.round(Math.min(MAX_FILES_PANE, pixels.files + pixels.editor - MIN_EDITOR_PANE))
          : Math.round(containerWidth - PANE_SEPARATOR_WIDTH * 2 - MIN_GRAPH_PANE)}
        aria-valuemin={kind === 'files' ? MIN_FILES_PANE : Math.round(pixels.files + MIN_EDITOR_PANE)}
        aria-valuenow={Math.round(value)}
        className={`pane-separator ${activeSeparator === kind ? 'is-active' : ''}`}
        onDoubleClick={resetLayout}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 32 : 10;
          if (event.key === 'ArrowLeft') resizeBy(kind, -step);
          else if (event.key === 'ArrowRight') resizeBy(kind, step);
          else if (event.key === 'Home') resizeToEdge(kind, 'minimum');
          else if (event.key === 'End') resizeToEdge(kind, 'maximum');
          else if (event.key === 'Enter') resetLayout();
          else return;
          event.preventDefault();
          if (event.key !== 'Enter') requestAnimationFrame(commitLayout);
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          dragRef.current = {
            kind,
            layout: pixels,
            pointerId: event.pointerId,
            startX: event.clientX,
          };
          setActiveSeparator(kind);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.kind !== kind || drag.pointerId !== event.pointerId) return;
          const delta = event.clientX - drag.startX;
          if (kind === 'files') {
            updateFromPixels({
              files: drag.layout.files + delta,
              editor: drag.layout.editor - delta,
            });
          } else {
            updateFromPixels({ files: drag.layout.files, editor: drag.layout.editor + delta });
          }
        }}
        onPointerUp={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId) return;
          dragRef.current = undefined;
          setActiveSeparator(undefined);
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          requestAnimationFrame(commitLayout);
        }}
        onPointerCancel={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId) return;
          dragRef.current = undefined;
          setActiveSeparator(undefined);
          const restoredLayout = paneLayoutFromPixels(drag.layout, containerWidth);
          layoutRef.current = restoredLayout;
          setLayout(restoredLayout);
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        role="separator"
        tabIndex={0}
        title="Drag to resize. Double-click or press Enter to reset."
      >
        <span />
      </div>
    );
  };

  return (
    <div
      className="workspace-grid"
      ref={containerRef}
      style={{
        gridTemplateColumns: `${pixels.files}px ${PANE_SEPARATOR_WIDTH}px ${pixels.editor}px ${PANE_SEPARATOR_WIDTH}px minmax(${MIN_GRAPH_PANE}px, 1fr)`,
      }}
    >
      {filesPane}
      {separator('files', 'Resize File hierarchy and editor panes')}
      {editorPane}
      {separator('graph', 'Resize editor and Relationship Graph panes')}
      {graphPane}
    </div>
  );
}
