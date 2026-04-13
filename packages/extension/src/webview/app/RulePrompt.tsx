import React, { useMemo, useState } from 'react';
import { mdiClose } from '@mdi/js';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { MdiIcon } from '../components/icons/MdiIcon';

export type RulePromptState =
  | { kind: 'filter'; pattern: string }
  | { kind: 'legend'; pattern: string; color: string; target: 'node' | 'edge' };

interface RulePromptProps {
  onClose: () => void;
  onSubmit: (state: RulePromptState) => void;
  state: RulePromptState | null;
}

export function RulePrompt({
  onClose,
  onSubmit,
  state,
}: RulePromptProps): React.ReactElement | null {
  const [pattern, setPattern] = useState(state?.pattern ?? '');
  const [color, setColor] = useState(state?.kind === 'legend' ? state.color : '#808080');

  React.useEffect(() => {
    setPattern(state?.pattern ?? '');
    setColor(state?.kind === 'legend' ? state.color : '#808080');
  }, [state]);

  const title = useMemo(() => {
    if (!state) {
      return '';
    }

    return state.kind === 'filter' ? 'Add Filter' : 'Add Legend Group';
  }, [state]);

  if (!state) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-sm rounded-lg border bg-popover/95 shadow-lg backdrop-blur-sm">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">{title}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose} title="Close">
            <MdiIcon path={mdiClose} size={16} />
          </Button>
        </div>
        <div className="space-y-3 px-3 py-3">
          <Input
            autoFocus
            aria-label={`${title} pattern`}
            value={pattern}
            onChange={(event) => setPattern(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                onSubmit(
                  state.kind === 'filter'
                    ? { kind: 'filter', pattern }
                    : { kind: 'legend', pattern, color, target: state.target },
                );
              }
            }}
          />
          {state.kind === 'legend' ? (
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground" htmlFor="legend-rule-color">
                Color
              </label>
              <input
                id="legend-rule-color"
                aria-label="Legend rule color"
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="h-8 w-10 cursor-pointer rounded border border-border/60 bg-transparent p-0"
              />
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() =>
                onSubmit(
                  state.kind === 'filter'
                    ? { kind: 'filter', pattern }
                    : { kind: 'legend', pattern, color, target: state.target },
                )
              }
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
