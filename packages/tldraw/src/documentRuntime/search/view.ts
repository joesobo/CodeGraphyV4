import {
  createElement,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type ReactElement,
} from 'react';
import { useEditor, useValue, type Editor, type TLShape } from 'tldraw';
import {
  createSearchProjection,
  graphSearchEventName,
  normalizeGraphSearchQuery,
  type GraphSearchEventDetail,
} from './model';

const panelStyle = {
  left: 12,
  margin: '0 auto',
  maxWidth: 360,
  pointerEvents: 'auto',
  position: 'absolute',
  right: 176,
  top: 12,
  zIndex: 300,
} satisfies CSSProperties;

const inputStyle = {
  background: 'var(--tl-color-background)',
  border: '1px solid var(--tl-color-low-border)',
  borderRadius: 8,
  boxShadow: 'var(--tl-shadow-2)',
  color: 'var(--tl-color-text-1)',
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 13,
  height: 40,
  outline: 'none',
  padding: '0 40px 0 38px',
  width: '100%',
} satisfies CSSProperties;

function publishGraphSearch(query: string): void {
  const detail = { query: normalizeGraphSearchQuery(query) } satisfies GraphSearchEventDetail;
  window.dispatchEvent(new CustomEvent(graphSearchEventName, { detail }));
}

function shapeVisibilityCss(hiddenShapeIds: ReadonlySet<string>): string {
  return [...hiddenShapeIds]
    .map(shapeId => `[data-shape-id="${shapeId}"]`)
    .join(',\n')
    .concat(hiddenShapeIds.size > 0 ? ' {\n  display: none !important;\n}' : '');
}

interface ShapeBounds {
  h: number;
  w: number;
  x: number;
  y: number;
}

function commonBounds(bounds: readonly ShapeBounds[]): ShapeBounds | undefined {
  if (bounds.length === 0) return undefined;
  let minimumX = Number.POSITIVE_INFINITY;
  let minimumY = Number.POSITIVE_INFINITY;
  let maximumX = Number.NEGATIVE_INFINITY;
  let maximumY = Number.NEGATIVE_INFINITY;
  for (const value of bounds) {
    minimumX = Math.min(minimumX, value.x);
    minimumY = Math.min(minimumY, value.y);
    maximumX = Math.max(maximumX, value.x + value.w);
    maximumY = Math.max(maximumY, value.y + value.h);
  }
  return {
    h: maximumY - minimumY,
    w: maximumX - minimumX,
    x: minimumX,
    y: minimumY,
  };
}

function focusSearchResults(editor: Editor, shapes: readonly TLShape[]): void {
  const bounds = commonBounds(
    shapes
      .filter(shape => shape.meta.codegraphyKind === 'node')
      .flatMap(shape => {
        const shapeBounds = editor.getShapePageBounds(shape.id);
        return shapeBounds
          ? [{
            h: shapeBounds.h,
            w: shapeBounds.w,
            x: shapeBounds.x,
            y: shapeBounds.y,
          }]
          : [];
      }),
  );
  if (!bounds) return;
  editor.zoomToBounds(bounds, {
    animation: { duration: 200 },
    inset: 160,
    targetZoom: 1,
  });
}

export function GraphSearchPanel(): ReactElement {
  const editor = useEditor();
  const shapes = useValue(
    'CodeGraphy graph search shapes',
    () => editor.getCurrentPageShapes(),
    [editor],
  );
  const [query, setQuery] = useState('');
  const lastPublishedQuery = useRef('');
  const projection = createSearchProjection(shapes, query);

  useEffect(() => () => publishGraphSearch(''), []);

  function updateQuery(nextQuery: string): void {
    setQuery(nextQuery);
    const normalizedQuery = normalizeGraphSearchQuery(nextQuery);
    if (normalizedQuery === lastPublishedQuery.current) return;
    lastPublishedQuery.current = normalizedQuery;
    editor.selectNone();
    focusSearchResults(
      editor,
      createSearchProjection(shapes, normalizedQuery).visibleShapes,
    );
    publishGraphSearch(normalizedQuery);
  }

  return createElement('section', {
    'aria-label': 'CodeGraphy graph search',
    role: 'search',
    style: panelStyle,
  },
  createElement('span', {
    'aria-hidden': true,
    style: {
      color: 'var(--tl-color-text-3)',
      fontSize: 17,
      left: 13,
      pointerEvents: 'none',
      position: 'absolute',
      top: 10,
    },
  }, '⌕'),
  createElement('input', {
    'aria-label': 'Search files',
    onChange: (event: ChangeEvent<HTMLInputElement>) => updateQuery(event.currentTarget.value),
    placeholder: 'Search files…',
    role: 'searchbox',
    style: inputStyle,
    type: 'text',
    value: query,
  }),
  query.length > 0
    ? createElement('button', {
      'aria-label': 'Clear search',
      onClick: () => updateQuery(''),
      style: {
        background: 'transparent',
        border: 0,
        color: 'var(--tl-color-text-3)',
        cursor: 'pointer',
        fontSize: 18,
        height: 32,
        padding: 0,
        position: 'absolute',
        right: 5,
        top: 4,
        width: 32,
      },
      type: 'button',
    }, '×')
    : null,
  createElement('style', {
    'data-codegraphy-search-visibility': true,
  }, shapeVisibilityCss(projection.hiddenShapeIds)));
}
