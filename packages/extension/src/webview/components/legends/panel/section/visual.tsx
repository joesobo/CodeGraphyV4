import React from 'react';
import type { IGroup } from '../../../../../shared/settings/groups';
import type { NodeShape2D, NodeShape3D } from '../../../../../shared/settings/modes';
import { Button } from '../../../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../../../ui/overlay/popover';
import { createLegendIconImport } from './icons';
import type { LegendRuleChange } from './contracts';

interface ShapeOption {
  label: string;
  shape2D: NodeShape2D;
  shape3D: NodeShape3D;
}

const SHAPE_OPTIONS: ShapeOption[] = [
  { label: 'Circle', shape2D: 'circle', shape3D: 'sphere' },
  { label: 'Square', shape2D: 'square', shape3D: 'cube' },
  { label: 'Diamond', shape2D: 'diamond', shape3D: 'octahedron' },
  { label: 'Triangle', shape2D: 'triangle', shape3D: 'cone' },
  { label: 'Hexagon', shape2D: 'hexagon', shape3D: 'dodecahedron' },
  { label: 'Star', shape2D: 'star', shape3D: 'icosahedron' },
];

function getVisibleShape(rule: IGroup): string | undefined {
  return rule.shape2D ?? rule.shape3D;
}

function LegendVisualSummary({
  rule,
}: {
  rule: IGroup;
}): React.ReactElement | null {
  const shape = getVisibleShape(rule);

  if (!rule.imageUrl && !shape) {
    return null;
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      {rule.imageUrl ? (
        <img
          src={rule.imageUrl}
          alt={`${rule.pattern} icon`}
          className="h-5 w-5 rounded-sm border border-border/50 bg-black/20 object-contain p-0.5"
        />
      ) : null}
      {shape ? (
        <span className="rounded-sm border border-border/50 px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
          {shape}
        </span>
      ) : null}
    </div>
  );
}

function applyShape(rule: IGroup, option: ShapeOption | undefined): IGroup {
  if (!option) {
    const nextRule = { ...rule };
    delete nextRule.shape2D;
    delete nextRule.shape3D;
    return nextRule;
  }

  return {
    ...rule,
    shape2D: option.shape2D,
    shape3D: option.shape3D,
  };
}

function canEditRuleVisual(editable: boolean, rule: IGroup): boolean {
  return editable && (rule.target ?? 'node') !== 'edge';
}

function ShapeButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}): React.ReactElement {
  return (
    <Button
      type="button"
      variant={active ? 'default' : 'outline'}
      size="sm"
      className="h-7 text-[11px]"
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function ShapeSelection({
  rule,
  onChange,
}: {
  rule: IGroup;
  onChange: LegendRuleChange;
}): React.ReactElement {
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Shape
      </div>
      <div className="grid grid-cols-3 gap-1">
        <ShapeButton
          active={!rule.shape2D && !rule.shape3D}
          onClick={() => onChange(applyShape(rule, undefined))}
        >
          None
        </ShapeButton>
        {SHAPE_OPTIONS.map((option) => (
          <ShapeButton
            key={option.shape2D}
            active={rule.shape2D === option.shape2D}
            onClick={() => onChange(applyShape(rule, option))}
          >
            {option.label}
          </ShapeButton>
        ))}
      </div>
    </div>
  );
}

function readLegendIconUpload(
  rule: IGroup,
  file: File,
  onChange: LegendRuleChange,
): void {
  void createLegendIconImport(rule.id, file).then(({ imageUrl, importPayload }) => {
    onChange(
      {
        ...rule,
        imagePath: importPayload.imagePath,
        imageUrl,
      },
      [importPayload],
    );
  });
}

function IconUploadInput({
  index,
  rule,
  onChange,
}: {
  index: number;
  rule: IGroup;
  onChange: LegendRuleChange;
}): React.ReactElement {
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Icon
      </div>
      <input
        aria-label={`Legend icon ${index + 1}`}
        type="file"
        accept=".svg,.png,image/svg+xml,image/png"
        className="block w-full text-[11px] text-muted-foreground file:mr-2 file:rounded-sm file:border file:border-border/60 file:bg-background/30 file:px-2 file:py-1 file:text-[11px] file:text-foreground"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) {
            readLegendIconUpload(rule, file, onChange);
          }
        }}
      />
    </div>
  );
}

function LegendVisualPopoverContent({
  index,
  rule,
  onChange,
}: {
  index: number;
  rule: IGroup;
  onChange: LegendRuleChange;
}): React.ReactElement {
  return (
    <PopoverContent align="end" className="w-72 p-3">
      <div className="space-y-3">
        <ShapeSelection rule={rule} onChange={onChange} />
        <IconUploadInput index={index} rule={rule} onChange={onChange} />
      </div>
    </PopoverContent>
  );
}

export function LegendRuleVisual({
  editable,
  index,
  rule,
  title,
  onChange,
}: {
  editable: boolean;
  index: number;
  rule: IGroup;
  title: string;
  onChange: LegendRuleChange;
}): React.ReactElement | null {
  if (!canEditRuleVisual(editable, rule)) {
    return <LegendVisualSummary rule={rule} />;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 shrink-0 gap-1 border-border/60 bg-background/20 px-2 text-[11px] text-muted-foreground hover:bg-accent/20 hover:text-foreground"
          title={title}
        >
          <LegendVisualSummary rule={rule} />
          <span>Visual</span>
        </Button>
      </PopoverTrigger>
      <LegendVisualPopoverContent index={index} rule={rule} onChange={onChange} />
    </Popover>
  );
}
