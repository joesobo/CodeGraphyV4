import React, { useState } from 'react';
import { mdiImageOff } from '@mdi/js';
import { MdiIcon } from '../../../../icons/MdiIcon';
import type { ShapeOption } from './types';

export function IconPreview({
  imageUrl,
  label,
}: {
  imageUrl: string;
  label: string;
}): React.ReactElement {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span title={`${label} icon unavailable`} className="text-muted-foreground">
        <MdiIcon path={mdiImageOff} size={15} />
      </span>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={`${label} icon`}
      className="h-4 w-4 object-contain"
      onError={() => setFailed(true)}
    />
  );
}

export function ShapePreview({
  label,
  option,
}: {
  label: string;
  option: ShapeOption;
}): React.ReactElement {
  return (
    <span
      title={label}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-[var(--cg-border-subtle)] bg-[var(--cg-surface-muted)] text-muted-foreground"
    >
      <MdiIcon path={option.icon} size={15} />
    </span>
  );
}
