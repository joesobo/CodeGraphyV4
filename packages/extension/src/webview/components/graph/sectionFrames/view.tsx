import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
} from 'react';
import {
  mdiChevronUp,
  mdiImagePlus,
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
  getSectionFrameDisplaySection,
  getSectionFrameRect,
  getVisibleSectionFrames,
  type SectionFrameResizeCorner,
  type SectionFrameDragType,
  type SectionFrameGraph,
  type SectionFrameNodePosition,
  type SectionFrameRect,
} from './model';
import {
  getGraphSectionMaterialIconPath,
  isGraphSectionUploadedIcon,
  readGraphSectionIconUpload,
} from './icons';

interface SectionFramesProps {
  graph?: SectionFrameGraph;
  ownership?: Readonly<Record<string, GraphLayoutOwnership>>;
  pinnedSectionIds?: ReadonlySet<string>;
  sectionNodePositions?: ReadonlyMap<string, SectionFrameNodePosition>;
  sections: readonly GraphLayoutSection[];
  onOpenSectionContextMenu?: (this: void, sectionId: string, event: ReactMouseEvent<HTMLDivElement>) => void;
  onUpdateSection: SectionFrameUpdateHandler;
}

const TOPBAR_FADE_OUT_SCALE = 0.65;
const TOPBAR_FULL_SCALE = 1;

function getTopbarOpacity(rect: SectionFrameRect): number {
  if (rect.scale <= TOPBAR_FADE_OUT_SCALE) {
    return 0;
  }

  if (rect.scale >= TOPBAR_FULL_SCALE) {
    return 1;
  }

  return (rect.scale - TOPBAR_FADE_OUT_SCALE) / (TOPBAR_FULL_SCALE - TOPBAR_FADE_OUT_SCALE);
}

function isTopbarVisible(opacity: number): boolean {
  return opacity > 0.01;
}

interface SectionFrameLabelInputProps {
  label: string;
  sectionId: string;
  showTopbar: boolean;
  onUpdateSection: SectionFrameUpdateHandler;
}

function SectionFrameLabelInput({
  label,
  sectionId,
  showTopbar,
  onUpdateSection,
}: SectionFrameLabelInputProps): ReactElement {
  const [draft, setDraft] = useState(label);
  const shouldCommitOnBlurRef = useRef(true);

  useEffect(() => {
    setDraft(label);
  }, [label, sectionId]);

  function commitDraft(): void {
    if (!shouldCommitOnBlurRef.current) {
      shouldCommitOnBlurRef.current = true;
      return;
    }

    if (draft !== label) {
      onUpdateSection(sectionId, { label: draft });
    }
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Enter') {
      event.currentTarget.blur();
      return;
    }

    if (event.key === 'Escape') {
      shouldCommitOnBlurRef.current = false;
      setDraft(label);
      event.currentTarget.blur();
    }
  }

  return (
    <input
      aria-label="Graph Section label"
      className="w-24 max-w-[45%] cursor-text bg-transparent text-xs font-medium outline-none"
      data-graph-section-control="true"
      onBlur={commitDraft}
      onChange={(event) => setDraft(event.target.value)}
      onFocus={() => {
        shouldCommitOnBlurRef.current = true;
      }}
      onKeyDown={handleKeyDown}
      tabIndex={showTopbar ? 0 : -1}
      value={draft}
    />
  );
}

interface SectionFrameIconInputProps {
  icon: string | undefined;
  sectionId: string;
  showTopbar: boolean;
  onUpdateSection: SectionFrameUpdateHandler;
}

function SectionFrameIconInput({
  icon,
  sectionId,
  showTopbar,
  onUpdateSection,
}: SectionFrameIconInputProps): ReactElement {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const materialIconPath = getGraphSectionMaterialIconPath(icon);
  const uploadedIcon = isGraphSectionUploadedIcon(icon) ? icon : undefined;

  return (
    <div className="flex h-5 shrink-0 items-center" data-graph-section-control="true">
      <button
        aria-label="Upload Graph Section icon"
        className="flex h-5 w-5 items-center justify-center rounded-sm border border-[var(--cg-border)] bg-[rgba(15,23,42,0.18)] hover:bg-[var(--cg-accent)]"
        data-graph-section-control="true"
        onClick={(event) => {
          event.stopPropagation();
          fileInputRef.current?.click();
        }}
        tabIndex={showTopbar ? 0 : -1}
        type="button"
      >
        {uploadedIcon ? (
          <img src={uploadedIcon} alt="" className="h-4 w-4 object-contain" />
        ) : materialIconPath ? (
          <MdiIcon path={materialIconPath} size={14} />
        ) : (
          <MdiIcon path={mdiImagePlus} size={13} />
        )}
      </button>
      <input
        ref={fileInputRef}
        aria-label="Graph Section icon upload"
        className="sr-only"
        data-graph-section-control="true"
        type="file"
        accept=".svg,.png,image/svg+xml,image/png"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (!file) {
            return;
          }

          void readGraphSectionIconUpload(file).then(nextIcon => {
            onUpdateSection(sectionId, { icon: nextIcon });
          });
        }}
        tabIndex={-1}
      />
    </div>
  );
}

const RESIZE_HANDLES: Array<{
  corner: SectionFrameResizeCorner;
  className: string;
  cursor: string;
}> = [
  { corner: 'northwest', className: 'left-0 top-0 border-l-2 border-t-2', cursor: 'cursor-nw-resize' },
  { corner: 'northeast', className: 'right-0 top-0 border-r-2 border-t-2', cursor: 'cursor-ne-resize' },
  { corner: 'southwest', className: 'bottom-0 left-0 border-b-2 border-l-2', cursor: 'cursor-sw-resize' },
  { corner: 'southeast', className: 'bottom-0 right-0 border-b-2 border-r-2', cursor: 'cursor-se-resize' },
];

function applySectionFrameElementRect(
  element: HTMLDivElement,
  graph: SectionFrameGraph | undefined,
  section: GraphLayoutSection,
): void {
  const rect = getSectionFrameRect(graph, section);
  element.style.height = `${rect.height}px`;
  element.style.left = `${rect.left}px`;
  element.style.top = `${rect.top}px`;
  element.style.width = `${rect.width}px`;

  const header = element.querySelector<HTMLElement>('[data-graph-section-header="true"]');
  if (!header) {
    return;
  }

  const opacity = getTopbarOpacity(rect);
  const visible = isTopbarVisible(opacity);
  header.style.opacity = `${opacity}`;
  header.dataset.sectionFrameHeader = visible ? 'visible' : 'hidden';
  header.setAttribute('aria-hidden', visible ? 'false' : 'true');
  header.classList.toggle('pointer-events-auto', visible);
  header.classList.toggle('pointer-events-none', !visible);
}

export function SectionFrames({
  graph,
  ownership = {},
  pinnedSectionIds = new Set<string>(),
  sectionNodePositions = new Map<string, SectionFrameNodePosition>(),
  sections,
  onOpenSectionContextMenu,
  onUpdateSection,
}: SectionFramesProps): ReactElement | null {
  const frameElementsRef = useRef(new Map<string, HTMLDivElement>());
  const visibleSections = getVisibleSectionFrames(
    sections,
    ownership,
  );

  useEffect(() => {
    if (visibleSections.length === 0 || sectionNodePositions.size === 0) {
      return undefined;
    }

    let frame = 0;
    const updateFrameRects = (): void => {
      for (const section of visibleSections) {
        const element = frameElementsRef.current.get(section.id);
        if (!element) {
          continue;
        }

        applySectionFrameElementRect(
          element,
          graph,
          getSectionFrameDisplaySection(section, sectionNodePositions.get(section.id)),
        );
      }
      frame = requestAnimationFrame(updateFrameRects);
    };

    updateFrameRects();

    return () => cancelAnimationFrame(frame);
  }, [graph, sectionNodePositions, visibleSections]);

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
      nodePosition: sectionNodePositions.get(section.id),
      section,
      type,
    }, onUpdateSection);
  }

  function registerFrameElement(sectionId: string, element: HTMLDivElement | null): void {
    if (element) {
      frameElementsRef.current.set(sectionId, element);
      return;
    }

    frameElementsRef.current.delete(sectionId);
  }

  function getDisplaySection(section: GraphLayoutSection): GraphLayoutSection {
    return getSectionFrameDisplaySection(section, sectionNodePositions.get(section.id));
  }

  function handleHeaderContextMenu(
    event: ReactMouseEvent<HTMLDivElement>,
    sectionId: string,
  ): void {
    event.preventDefault();
    event.stopPropagation();
    onOpenSectionContextMenu?.(sectionId, event);
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-10" data-testid="graph-section-frames">
      {visibleSections.map(section => {
        const displaySection = getDisplaySection(section);
        const rect = getSectionFrameRect(graph, displaySection);
        const topbarOpacity = getTopbarOpacity(rect);
        const showTopbar = isTopbarVisible(topbarOpacity);
        return (
          <div
            key={section.id}
            ref={(element) => registerFrameElement(section.id, element)}
            data-graph-marquee-ignore="true"
            data-testid={`graph-section-frame-${section.id}`}
            className="pointer-events-none absolute overflow-hidden rounded-md border bg-[rgba(59,130,246,0.08)] shadow-sm"
            onMouseDown={(event) => beginDrag(event, getDisplaySection(section), 'move')}
            style={{
              borderColor: section.color,
              height: rect.height,
              left: rect.left,
              top: rect.top,
              width: rect.width,
            }}
          >
            <div
              aria-hidden={!showTopbar}
              data-graph-section-header="true"
              data-testid={`graph-section-drag-handle-${section.id}`}
              data-section-frame-header={showTopbar ? 'visible' : 'hidden'}
              className={[
                'relative flex h-7 cursor-grab items-center gap-1 border-b px-1 pr-16 active:cursor-grabbing',
                showTopbar ? 'pointer-events-auto' : 'pointer-events-none',
              ].join(' ')}
              onContextMenu={(event) => handleHeaderContextMenu(event, section.id)}
              style={{
                backgroundColor: `${section.color}22`,
                borderColor: section.color,
                opacity: topbarOpacity,
              }}
            >
              <button
                aria-label="Collapse Graph Section"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-[var(--cg-foreground)] hover:bg-[var(--cg-accent)]"
                data-graph-section-control="true"
                onClick={(event) => {
                  event.stopPropagation();
                  onUpdateSection(section.id, { collapsed: true });
                }}
                tabIndex={showTopbar ? 0 : -1}
                type="button"
              >
                <MdiIcon path={mdiChevronUp} size={14} />
              </button>
              <SectionFrameIconInput
                icon={section.icon}
                sectionId={section.id}
                showTopbar={showTopbar}
                onUpdateSection={onUpdateSection}
              />
              <SectionFrameLabelInput
                label={section.label}
                sectionId={section.id}
                showTopbar={showTopbar}
                  onUpdateSection={onUpdateSection}
                />
              <input
                aria-label="Graph Section color"
                className="absolute right-1 top-1 h-5 w-6 cursor-pointer bg-transparent p-0"
                data-graph-section-control="true"
                onChange={(event) => onUpdateSection(section.id, { color: event.target.value })}
                tabIndex={showTopbar ? 0 : -1}
                type="color"
                value={section.color}
              />
              {pinnedSectionIds.has(section.id) ? (
                <span
                  aria-label="Pinned Graph Section"
                  className="absolute right-9 top-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[var(--cg-foreground)]"
                  data-graph-section-control="true"
                  role="img"
                >
                  <MdiIcon path={mdiPin} size={12} />
                </span>
              ) : null}
            </div>
            {RESIZE_HANDLES.map(handle => (
              <div
                key={handle.corner}
                data-graph-section-control="true"
                data-testid={
                  handle.corner === 'southeast'
                    ? `graph-section-resize-${section.id}`
                    : `graph-section-resize-${section.id}-${handle.corner}`
                }
                className={[
                  'pointer-events-auto absolute h-3 w-3',
                  handle.cursor,
                  handle.className,
                ].join(' ')}
                onMouseDown={(event) => beginDrag(event, getDisplaySection(section), `resize:${handle.corner}`)}
                style={{ borderColor: section.color }}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
