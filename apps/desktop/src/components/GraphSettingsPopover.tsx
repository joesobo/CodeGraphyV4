import {
  GRAPH_PHYSICS_CONTROL_LIMITS,
  type GraphPhysicsSettings,
} from '@codegraphy-dev/graph-visuals';
import { useEffect, useRef, useState } from 'react';

interface GraphSettingsControl {
  description: string;
  digits: number;
  key: 'repelForce' | 'centerForce' | 'linkDistance';
  label: string;
}

const CONTROLS: readonly GraphSettingsControl[] = [
  {
    key: 'repelForce',
    label: 'Repel Force',
    description: 'Pushes Nodes apart.',
    digits: 0,
  },
  {
    key: 'centerForce',
    label: 'Center Force',
    description: 'Pulls Nodes toward the graph origin.',
    digits: 2,
  },
  {
    key: 'linkDistance',
    label: 'Link Distance',
    description: 'Sets the target Relationship length.',
    digits: 0,
  },
];

export function GraphSettingsPopover({
  onChange,
  onCommit,
  onReset,
  settings,
}: {
  onChange: (key: keyof GraphPhysicsSettings, value: number) => void;
  onCommit: () => void;
  onReset: () => void;
  settings: GraphPhysicsSettings;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstControlRef = useRef<HTMLInputElement>(null);

  const close = (restoreFocus: boolean): void => {
    onCommit();
    setOpen(false);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  };

  useEffect(() => {
    if (!open) return;
    firstControlRef.current?.focus();
    const closeFromOutside = (event: PointerEvent): void => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) close(false);
    };
    document.addEventListener('pointerdown', closeFromOutside);
    return () => document.removeEventListener('pointerdown', closeFromOutside);
  });

  return (
    <div className="graph-settings" ref={rootRef}>
      <button
        aria-controls="graph-settings-popover"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Graph Settings"
        className="graph-settings-trigger"
        onClick={() => open ? close(false) : setOpen(true)}
        ref={triggerRef}
        title="Graph Settings"
        type="button"
      >
        <span aria-hidden="true" className="graph-settings-icon"><i /><i /><i /></span>
      </button>

      {open ? (
        <div
          aria-labelledby="graph-settings-title"
          className="graph-settings-popover"
          id="graph-settings-popover"
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            close(true);
          }}
          role="dialog"
        >
          <div className="graph-settings-heading">
            <div>
              <strong id="graph-settings-title">Graph Settings</strong>
              <span>Live WebAssembly physics</span>
            </div>
            <button className="graph-settings-reset" onClick={onReset} type="button">
              Reset
            </button>
          </div>
          <div className="graph-settings-controls">
            {CONTROLS.map((control, index) => {
              const limits = GRAPH_PHYSICS_CONTROL_LIMITS[control.key];
              const value = settings[control.key];
              const inputId = `graph-setting-${control.key}`;
              return (
                <div className="graph-settings-control" key={control.key}>
                  <div className="graph-settings-control-heading">
                    <label htmlFor={inputId}>{control.label}</label>
                    <output htmlFor={inputId}>{value.toFixed(control.digits)}</output>
                  </div>
                  <input
                    aria-describedby={`${inputId}-description`}
                    id={inputId}
                    max={limits.max}
                    min={limits.min}
                    onBlur={onCommit}
                    onInput={(event) => onChange(control.key, event.currentTarget.valueAsNumber)}
                    onKeyUp={(event) => {
                      if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) {
                        onCommit();
                      }
                    }}
                    onPointerUp={onCommit}
                    ref={index === 0 ? firstControlRef : undefined}
                    step={limits.step}
                    type="range"
                    value={value}
                  />
                  <span id={`${inputId}-description`}>{control.description}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
