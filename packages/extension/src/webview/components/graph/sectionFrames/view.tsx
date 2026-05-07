import { type MouseEvent as ReactMouseEvent, type ReactElement } from 'react';
import {
  mdiChevronUp,
  mdiPin,
} from '@mdi/js';
import { MdiIcon } from '../../icons/MdiIcon';
import {
  isGraphLayoutSectionVisible,
  sortGraphLayoutSectionsForRendering,
  type GraphLayoutOwnership,
  type GraphLayoutSection,
  type GraphLayoutSectionUpdate,
} from '../../../../shared/settings/graphLayout';

interface SectionFrameGraph {
  graph2ScreenCoords?(x: number, y: number): { x: number; y: number };
  screen2GraphCoords?(x: number, y: number): { x: number; y: number };
}

interface SectionFramesProps {
  graph?: SectionFrameGraph;
  ownership?: Readonly<Record<string, GraphLayoutOwnership>>;
  pinnedSectionIds?: ReadonlySet<string>;
  sections: readonly GraphLayoutSection[];
  onUpdateSection(this: void, sectionId: string, updates: GraphLayoutSectionUpdate): void;
}

interface DragState {
  clientX: number;
  clientY: number;
  section: GraphLayoutSection;
  type: 'move' | 'resize';
}

const MIN_SECTION_SIZE = 80;

function graphToScreen(
  graph: SectionFrameGraph | undefined,
  x: number,
  y: number,
): { x: number; y: number } {
  return graph?.graph2ScreenCoords?.(x, y) ?? { x, y };
}

function screenToGraph(
  graph: SectionFrameGraph | undefined,
  x: number,
  y: number,
): { x: number; y: number } {
  return graph?.screen2GraphCoords?.(x, y) ?? { x, y };
}

function getSectionFrameRect(
  graph: SectionFrameGraph | undefined,
  section: GraphLayoutSection,
): { height: number; left: number; top: number; width: number } {
  const topLeft = graphToScreen(graph, section.x, section.y);
  const bottomRight = graphToScreen(graph, section.x + section.width, section.y + section.height);
  return {
    height: Math.abs(bottomRight.y - topLeft.y),
    left: Math.min(topLeft.x, bottomRight.x),
    top: Math.min(topLeft.y, bottomRight.y),
    width: Math.abs(bottomRight.x - topLeft.x),
  };
}

function getDragDelta(
  graph: SectionFrameGraph | undefined,
  drag: DragState,
  event: MouseEvent,
): { x: number; y: number } {
  const start = screenToGraph(graph, drag.clientX, drag.clientY);
  const current = screenToGraph(graph, event.clientX, event.clientY);
  return {
    x: current.x - start.x,
    y: current.y - start.y,
  };
}

function beginWindowDrag(
  graph: SectionFrameGraph | undefined,
  drag: DragState,
  onUpdateSection: SectionFramesProps['onUpdateSection'],
): void {
  function handleMouseUp(event: MouseEvent): void {
    window.removeEventListener('mouseup', handleMouseUp);
    window.removeEventListener('mousemove', handleMouseMove);
    const delta = getDragDelta(graph, drag, event);

    if (drag.type === 'move') {
      onUpdateSection(drag.section.id, {
        x: drag.section.x + delta.x,
        y: drag.section.y + delta.y,
      });
      return;
    }

    onUpdateSection(drag.section.id, {
      height: Math.max(MIN_SECTION_SIZE, drag.section.height + delta.y),
      width: Math.max(MIN_SECTION_SIZE, drag.section.width + delta.x),
    });
  }

  function handleMouseMove(): void {
    // Keep the interaction captured by window until mouseup.
  }

  window.addEventListener('mouseup', handleMouseUp);
  window.addEventListener('mousemove', handleMouseMove);
}

function isSectionControl(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest('[data-graph-section-control="true"]');
}

function createSectionMap(
  sections: readonly GraphLayoutSection[],
): Record<string, GraphLayoutSection> {
  return Object.fromEntries(sections.map(section => [section.id, section]));
}

export function SectionFrames({
  graph,
  ownership = {},
  pinnedSectionIds = new Set<string>(),
  sections,
  onUpdateSection,
}: SectionFramesProps): ReactElement | null {
  const sectionMap = createSectionMap(sections);
  const visibleSections = sortGraphLayoutSectionsForRendering(
    sections,
    ownership,
  ).filter(section => isGraphLayoutSectionVisible(sectionMap, ownership, section.id));
  if (visibleSections.length === 0) {
    return null;
  }

  function beginDrag(
    event: ReactMouseEvent<HTMLDivElement>,
    section: GraphLayoutSection,
    type: DragState['type'],
  ): void {
    if (event.button !== 0 || (type === 'move' && isSectionControl(event.target))) {
      return;
    }

    event.preventDefault();
    beginWindowDrag(graph, {
      clientX: event.clientX,
      clientY: event.clientY,
      section,
      type,
    }, onUpdateSection);
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-10" data-testid="graph-section-frames">
      {visibleSections.map(section => {
        const rect = getSectionFrameRect(graph, section);
        return (
          <div
            key={section.id}
            data-testid={`graph-section-frame-${section.id}`}
            className="pointer-events-auto absolute overflow-hidden rounded-md border bg-[rgba(59,130,246,0.08)] shadow-sm"
            onMouseDown={(event) => beginDrag(event, section, 'move')}
            style={{
              borderColor: section.color,
              height: rect.height,
              left: rect.left,
              top: rect.top,
              width: rect.width,
            }}
          >
              <div
              className="flex h-7 items-center gap-1 border-b px-1"
              style={{ backgroundColor: `${section.color}22`, borderColor: section.color }}
            >
              <button
                aria-label="Collapse Graph Section"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-[var(--cg-foreground)] hover:bg-[var(--cg-accent)]"
                data-graph-section-control="true"
                onClick={(event) => {
                  event.stopPropagation();
                  onUpdateSection(section.id, { collapsed: true });
                }}
                onMouseDown={(event) => event.stopPropagation()}
                type="button"
              >
                <MdiIcon path={mdiChevronUp} size={14} />
              </button>
              <input
                aria-label="Graph Section label"
                className="min-w-0 flex-1 bg-transparent text-xs font-medium outline-none"
                data-graph-section-control="true"
                onChange={(event) => onUpdateSection(section.id, { label: event.target.value })}
                onMouseDown={(event) => event.stopPropagation()}
                value={section.label}
              />
              <input
                aria-label="Graph Section color"
                className="h-5 w-6 bg-transparent p-0"
                data-graph-section-control="true"
                onChange={(event) => onUpdateSection(section.id, { color: event.target.value })}
                onMouseDown={(event) => event.stopPropagation()}
                type="color"
                value={section.color}
              />
              {pinnedSectionIds.has(section.id) ? (
                <span
                  aria-label="Pinned Graph Section"
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[var(--cg-foreground)]"
                  data-graph-section-control="true"
                  role="img"
                >
                  <MdiIcon path={mdiPin} size={12} />
                </span>
              ) : null}
            </div>
            <div
              data-graph-section-control="true"
              data-testid={`graph-section-resize-${section.id}`}
              className="absolute bottom-0 right-0 h-3 w-3 cursor-se-resize border-b-2 border-r-2"
              onMouseDown={(event) => beginDrag(event, section, 'resize')}
              style={{ borderColor: section.color }}
            />
          </div>
        );
      })}
    </div>
  );
}
