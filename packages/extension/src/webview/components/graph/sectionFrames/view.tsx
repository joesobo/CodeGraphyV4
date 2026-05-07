import { type MouseEvent as ReactMouseEvent, type ReactElement } from 'react';
import {
  mdiChevronUp,
  mdiPin,
} from '@mdi/js';
import { MdiIcon } from '../../icons/MdiIcon';
import type { GraphLayoutOwnership, GraphLayoutSection } from '../../../../shared/settings/graphLayout';
import {
  beginSectionFrameWindowDrag,
  isSectionFrameControl,
  type SectionFrameUpdateHandler,
} from './drag';
import {
  getSectionFrameRect,
  getVisibleSectionFrames,
  type SectionFrameDragType,
  type SectionFrameGraph,
} from './model';

interface SectionFramesProps {
  graph?: SectionFrameGraph;
  ownership?: Readonly<Record<string, GraphLayoutOwnership>>;
  pinnedSectionIds?: ReadonlySet<string>;
  sections: readonly GraphLayoutSection[];
  onUpdateSection: SectionFrameUpdateHandler;
}

export function SectionFrames({
  graph,
  ownership = {},
  pinnedSectionIds = new Set<string>(),
  sections,
  onUpdateSection,
}: SectionFramesProps): ReactElement | null {
  const visibleSections = getVisibleSectionFrames(
    sections,
    ownership,
  );
  if (visibleSections.length === 0) {
    return null;
  }

  function beginDrag(
    event: ReactMouseEvent<HTMLDivElement>,
    section: GraphLayoutSection,
    type: SectionFrameDragType,
  ): void {
    if (event.button !== 0 || (type === 'move' && isSectionFrameControl(event.target))) {
      return;
    }

    event.preventDefault();
    beginSectionFrameWindowDrag(graph, {
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
                type="button"
              >
                <MdiIcon path={mdiChevronUp} size={14} />
              </button>
              <input
                aria-label="Graph Section label"
                className="min-w-0 flex-1 bg-transparent text-xs font-medium outline-none"
                data-graph-section-control="true"
                onChange={(event) => onUpdateSection(section.id, { label: event.target.value })}
                value={section.label}
              />
              <input
                aria-label="Graph Section color"
                className="h-5 w-6 bg-transparent p-0"
                data-graph-section-control="true"
                onChange={(event) => onUpdateSection(section.id, { color: event.target.value })}
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
