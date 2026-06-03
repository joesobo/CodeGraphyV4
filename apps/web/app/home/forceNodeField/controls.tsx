'use client';

import { Crosshair, Link2, MoveHorizontal, Orbit, Radius, type LucideIcon } from 'lucide-react';
import { useId } from 'react';
import { type ForceSettingKey, useForceNodeSettings } from './settings';

type ForceControlItem = {
  icon: LucideIcon;
  key: ForceSettingKey;
  label: string;
};

const forceControls: ForceControlItem[] = [
  {
    icon: Crosshair,
    key: 'center',
    label: 'Center',
  },
  {
    icon: Orbit,
    key: 'repel',
    label: 'Repel',
  },
  {
    icon: MoveHorizontal,
    key: 'distance',
    label: 'Distance',
  },
  {
    icon: Link2,
    key: 'link',
    label: 'Link force',
  },
  {
    icon: Radius,
    key: 'size',
    label: 'Node size',
  },
];

export function ForceNodeControls(): React.ReactElement {
  const idPrefix = useId().replace(/:/g, '');
  const { resetSettings, settings, updateSetting } = useForceNodeSettings();

  return (
    <aside className="hero-studio-panel force-control-panel">
      <div className="force-control-header">
        <div>
          <p className="section-kicker-blue text-xs font-black uppercase tracking-[0.08em]">Force graph</p>
          <h2 className="site-heading mt-1 text-2xl leading-none text-foreground">Play with the graph.</h2>
        </div>
        <button className="force-control-reset" onClick={resetSettings} type="button">
          Reset
        </button>
      </div>
      <div className="force-control-list">
        {forceControls.map(control => {
          const Icon = control.icon;
          const inputId = `${idPrefix}-${control.key}`;

          return (
            <label className="force-control-row" htmlFor={inputId} key={control.key}>
              <span className="icon-badge force-control-icon">
                <Icon size={18} />
              </span>
              <span className="force-control-label">{control.label}</span>
              <input
                aria-label={control.label}
                className="force-slider"
                id={inputId}
                max="100"
                min="0"
                onChange={event => {
                  updateSetting(control.key, Number(event.currentTarget.value));
                }}
                type="range"
                value={settings[control.key]}
              />
              <span className="force-control-value">{settings[control.key]}</span>
            </label>
          );
        })}
      </div>
    </aside>
  );
}
