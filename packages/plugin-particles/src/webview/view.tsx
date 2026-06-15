import { useState, type ReactElement } from 'react';
import {
  DEFAULT_PARTICLE_SETTINGS,
  PRESETS,
  getVisibleCustomEffects,
  type ParticleEffectAsset,
  type ParticleSettings,
} from './model';

interface ParticlesSectionProps {
  settings: ParticleSettings;
  customEffects: readonly ParticleEffectAsset[];
  onSettingsChange(this: void, settings: ParticleSettings): void;
}

export function ParticlesSection({
  settings,
  customEffects,
  onSettingsChange,
}: ParticlesSectionProps): ReactElement {
  const [collapsed, setCollapsed] = useState(false);
  const visibleCustomEffects = getVisibleCustomEffects(settings, customEffects);

  return (
    <section
      className="cg-bg-particles-section"
      data-codegraphy-section="particles"
      data-collapsed={collapsed ? 'true' : 'false'}
    >
      <button
        type="button"
        className="cg-bg-particles-header"
        title="Toggle Particles section"
        aria-expanded={collapsed ? 'false' : 'true'}
        onClick={() => setCollapsed(value => !value)}
      >
        <h3 className="cg-bg-particles-heading">Particles</h3>
        <span className="cg-bg-particles-chevron-shell" aria-hidden="true">
          <Chevron open={!collapsed} />
        </span>
      </button>

      <div className="cg-bg-particles-grid">
        {PRESETS.map(preset => (
          <ParticleRow
            key={preset.id}
            label={preset.label}
            checked={settings.enabled && settings.preset === preset.id}
            onToggle={() => {
              const nextEnabled = !(settings.enabled && settings.preset === preset.id);
              onSettingsChange(nextEnabled
                ? { enabled: true, preset: preset.id }
                : { ...DEFAULT_PARTICLE_SETTINGS });
            }}
          />
        ))}

        {visibleCustomEffects.map(effect => (
          <ParticleRow
            key={effect.id}
            label={effect.label}
            custom
            checked={settings.enabled && settings.preset === 'custom' && settings.customEffectId === effect.id}
            onToggle={() => {
              const nextEnabled = !(settings.enabled && settings.preset === 'custom' && settings.customEffectId === effect.id);
              onSettingsChange(nextEnabled
                ? {
                  enabled: true,
                  preset: 'custom',
                  customEffectId: effect.id,
                }
                : { ...DEFAULT_PARTICLE_SETTINGS });
            }}
          />
        ))}
      </div>
    </section>
  );
}

interface ParticleRowProps {
  label: string;
  checked: boolean;
  custom?: boolean;
  onToggle(this: void): void;
}

function ParticleRow({
  label,
  checked,
  custom = false,
  onToggle,
}: ParticleRowProps): ReactElement {
  return (
    <div className="cg-bg-particles-row">
      <span title={label}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-label={`Toggle ${label}${custom ? ' custom' : ''} background effect`}
        className="cg-bg-particles-switch"
        data-state={checked ? 'checked' : 'unchecked'}
        onClick={onToggle}
      >
        <span aria-hidden="true" />
      </button>
    </div>
  );
}

function Chevron({ open }: { open: boolean }): ReactElement {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      className="cg-bg-particles-chevron"
    >
      <path
        d={open ? 'M7 14l5-5 5 5' : 'M7 10l5 5 5-5'}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
