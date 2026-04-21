import React from 'react';
import {
  mdiCircle,
  mdiHexagon,
  mdiImage,
  mdiImagePlus,
  mdiImageOff,
  mdiRhombus,
  mdiSquare,
  mdiStar,
  mdiTriangle,
} from '@mdi/js';
import type { IGroup } from '../../../../../shared/settings/groups';
import type { NodeShape2D, NodeShape3D } from '../../../../../shared/settings/modes';
import { MdiIcon } from '../../../icons/MdiIcon';
import { Button } from '../../../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../../../ui/overlay/popover';
import { createLegendIconImport } from './icons';
import type { LegendRuleChange } from './contracts';

interface ShapeOption {
  label: string;
  icon: string;
  shape2D: NodeShape2D;
  shape3D: NodeShape3D;
}

export const DEFAULT_NODE_SHAPE: Pick<IGroup, 'shape2D' | 'shape3D'> = {
  shape2D: 'circle',
  shape3D: 'sphere',
};

export const SHAPE_OPTIONS: ShapeOption[] = [
  { label: 'Circle', icon: mdiCircle, shape2D: 'circle', shape3D: 'sphere' },
  { label: 'Square', icon: mdiSquare, shape2D: 'square', shape3D: 'cube' },
  { label: 'Diamond', icon: mdiRhombus, shape2D: 'diamond', shape3D: 'octahedron' },
  { label: 'Triangle', icon: mdiTriangle, shape2D: 'triangle', shape3D: 'cone' },
  { label: 'Hexagon', icon: mdiHexagon, shape2D: 'hexagon', shape3D: 'dodecahedron' },
  { label: 'Star', icon: mdiStar, shape2D: 'star', shape3D: 'icosahedron' },
];

function getShapeOption(rule: IGroup): ShapeOption {
  return SHAPE_OPTIONS.find((option) => option.shape2D === rule.shape2D) ?? SHAPE_OPTIONS[0];
}

function applyShape(rule: IGroup, option: ShapeOption): IGroup {
  return {
    ...rule,
    shape2D: option.shape2D,
    shape3D: option.shape3D,
  };
}

function canEditRuleVisual(editable: boolean, rule: IGroup): boolean {
  return editable && (rule.target ?? 'node') !== 'edge';
}

function IconPreview({ rule }: { rule: IGroup }): React.ReactElement {
  const label = rule.displayLabel ?? rule.pattern;

  if (rule.imageUrl) {
    return (
      <img
        src={rule.imageUrl}
        alt={`${label} icon`}
        className="h-4 w-4 object-contain"
      />
    );
  }

  return <MdiIcon path={mdiImage} size={16} />;
}

function ShapePreview({
  label,
  option,
}: {
  label: string;
  option: ShapeOption;
}): React.ReactElement {
  return (
    <span
      title={label}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-border/60 bg-background/20 text-muted-foreground"
    >
      <MdiIcon path={option.icon} size={15} />
    </span>
  );
}

export function LegendShapeControl({
  editable,
  rule,
  title,
  onChange,
}: {
  editable: boolean;
  rule: IGroup;
  title: string;
  onChange: LegendRuleChange;
}): React.ReactElement {
  const option = getShapeOption(rule);
  const label = rule.displayLabel ?? rule.pattern;

  if (!canEditRuleVisual(editable, rule)) {
    return <ShapePreview label={`${label} shape: ${option.shape2D}`} option={option} />;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7 shrink-0 border-border/60 bg-background/20 text-muted-foreground hover:bg-accent/20 hover:text-foreground"
          title={title}
        >
          <MdiIcon path={option.icon} size={15} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-2">
        <div className="grid grid-cols-3 gap-1">
        {SHAPE_OPTIONS.map((option) => (
          <Button
            key={option.shape2D}
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title={`Use ${option.shape2D} shape`}
            onClick={() => onChange(applyShape(rule, option))}
          >
            <MdiIcon path={option.icon} size={15} />
          </Button>
        ))}
        </div>
      </PopoverContent>
    </Popover>
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

function clearRuleIcon(rule: IGroup): IGroup {
  const nextRule = { ...rule };
  delete nextRule.imagePath;
  delete nextRule.imageUrl;
  return nextRule;
}

function IconUploadPanel({
  index,
  rule,
  onChange,
}: {
  index: number;
  rule: IGroup;
  onChange: LegendRuleChange;
}): React.ReactElement {
  return (
    <div className="space-y-3">
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
      {rule.imagePath || rule.imageUrl ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-[11px]"
          title="Clear legend icon"
          onClick={() => onChange(clearRuleIcon(rule))}
        >
          <MdiIcon path={mdiImageOff} size={14} />
          Clear icon
        </Button>
      ) : null}
    </div>
  );
}

export function LegendIconControl({
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
    return rule.imageUrl
      ? (
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-border/60 bg-background/20 text-muted-foreground">
            <IconPreview rule={rule} />
          </span>
        )
      : null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
        className="h-7 w-7 shrink-0 border-border/60 bg-background/20 text-muted-foreground hover:bg-accent/20 hover:text-foreground"
        title={title}
      >
          {rule.imageUrl ? <IconPreview rule={rule} /> : <MdiIcon path={mdiImagePlus} size={15} />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3">
        <IconUploadPanel index={index} rule={rule} onChange={onChange} />
      </PopoverContent>
    </Popover>
  );
}
