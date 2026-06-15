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
        <PresetRows settings={settings} onSettingsChange={onSettingsChange} />
        <CustomEffectRows
          settings={settings}
          customEffects={visibleCustomEffects}
          onSettingsChange={onSettingsChange}
        />
      </div>
    </section>
  );
}

interface PresetRowsProps {
  settings: ParticleSettings;
  onSettingsChange(this: void, settings: ParticleSettings): void;
}

function PresetRows({ settings, onSettingsChange }: PresetRowsProps): ReactElement {
  return (
    <>
      {PRESETS.map(preset => (
        <ParticleRow
          key={preset.id}
          label={preset.label}
          checked={isPresetChecked(settings, preset.id)}
          onToggle={() => onSettingsChange(togglePreset(settings, preset.id))}
        />
      ))}
    </>
  );
}

interface CustomEffectRowsProps {
  settings: ParticleSettings;
  customEffects: readonly ParticleEffectAsset[];
  onSettingsChange(this: void, settings: ParticleSettings): void;
}

function CustomEffectRows({
  settings,
  customEffects,
  onSettingsChange,
}: CustomEffectRowsProps): ReactElement {
  return (
    <>
      {customEffects.map(effect => (
        <ParticleRow
          key={effect.id}
          label={effect.label}
          custom
          checked={isCustomEffectChecked(settings, effect.id)}
          onToggle={() => onSettingsChange(toggleCustomEffect(settings, effect.id))}
        />
      ))}
    </>
  );
}

function isPresetChecked(settings: ParticleSettings, presetId: ParticleSettings['preset']): boolean {
  return settings.enabled && settings.preset === presetId;
}

function togglePreset(settings: ParticleSettings, presetId: ParticleSettings['preset']): ParticleSettings {
  return isPresetChecked(settings, presetId)
    ? { ...DEFAULT_PARTICLE_SETTINGS }
    : { enabled: true, preset: presetId };
}

function isCustomEffectChecked(settings: ParticleSettings, effectId: string): boolean {
  return settings.enabled && settings.preset === 'custom' && settings.customEffectId === effectId;
}

function toggleCustomEffect(settings: ParticleSettings, effectId: string): ParticleSettings {
  return isCustomEffectChecked(settings, effectId)
    ? { ...DEFAULT_PARTICLE_SETTINGS }
    : {
      enabled: true,
      preset: 'custom',
      customEffectId: effectId,
    };
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
