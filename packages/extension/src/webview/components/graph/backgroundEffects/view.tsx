import React from 'react';
import type { BackgroundEffectsSettings } from '../../../../shared/settings/backgroundEffects';

const PRESET_BACKGROUNDS: Record<Exclude<BackgroundEffectsSettings['preset'], 'none'>, string> = {
  leaves: [
    'radial-gradient(ellipse at 12% 18%, rgba(130, 190, 96, 0.34) 0 1px, transparent 2px)',
    'radial-gradient(ellipse at 76% 36%, rgba(202, 166, 84, 0.28) 0 1px, transparent 3px)',
    'linear-gradient(135deg, rgba(42, 80, 44, 0.16), transparent 48%)',
  ].join(', '),
  constellations: [
    'radial-gradient(circle at 20% 24%, rgba(189, 214, 255, 0.65) 0 1px, transparent 2px)',
    'radial-gradient(circle at 72% 38%, rgba(151, 183, 255, 0.45) 0 1px, transparent 2px)',
    'linear-gradient(118deg, transparent 0 38%, rgba(130, 164, 255, 0.2) 39% 40%, transparent 41%)',
  ].join(', '),
  embers: [
    'radial-gradient(circle at 18% 76%, rgba(255, 142, 77, 0.55) 0 1px, transparent 3px)',
    'radial-gradient(circle at 62% 62%, rgba(255, 207, 92, 0.38) 0 1px, transparent 3px)',
    'linear-gradient(0deg, rgba(120, 44, 23, 0.2), transparent 56%)',
  ].join(', '),
  rain: [
    'repeating-linear-gradient(105deg, rgba(155, 201, 255, 0.24) 0 1px, transparent 1px 16px)',
    'linear-gradient(180deg, rgba(45, 88, 120, 0.16), transparent)',
  ].join(', '),
  petals: [
    'radial-gradient(ellipse at 18% 28%, rgba(255, 165, 210, 0.34) 0 2px, transparent 3px)',
    'radial-gradient(ellipse at 68% 78%, rgba(255, 214, 232, 0.32) 0 2px, transparent 3px)',
    'linear-gradient(160deg, rgba(119, 55, 95, 0.12), transparent 46%)',
  ].join(', '),
  sparkles: [
    'radial-gradient(circle at 18% 30%, rgba(255, 255, 255, 0.64) 0 1px, transparent 2px)',
    'radial-gradient(circle at 74% 66%, rgba(172, 231, 255, 0.48) 0 1px, transparent 2px)',
    'radial-gradient(circle at 46% 48%, rgba(255, 244, 179, 0.45) 0 1px, transparent 2px)',
  ].join(', '),
  ocean: [
    'radial-gradient(ellipse at 20% 80%, rgba(80, 190, 205, 0.26), transparent 36%)',
    'repeating-linear-gradient(165deg, rgba(132, 225, 255, 0.14) 0 1px, transparent 1px 18px)',
  ].join(', '),
  terminal: [
    'repeating-linear-gradient(0deg, rgba(80, 255, 164, 0.08) 0 1px, transparent 1px 6px)',
    'linear-gradient(90deg, transparent, rgba(57, 255, 136, 0.14), transparent)',
  ].join(', '),
};

export function GraphBackgroundEffects({
  settings,
}: {
  settings: BackgroundEffectsSettings;
}): React.ReactElement | null {
  if (!settings.enabled || settings.preset === 'none') {
    return null;
  }

  return (
    <>
      <style>
        {`
          @keyframes cg-background-effects-drift {
            from { transform: translate3d(0, 0, 0); }
            to { transform: translate3d(-80px, -120px, 0); }
          }
          @media (prefers-reduced-motion: reduce) {
            [data-codegraphy-layer="graph-background-effects"] > span {
              animation: none !important;
            }
          }
        `}
      </style>
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 pointer-events-none overflow-hidden"
        data-codegraphy-layer="graph-background-effects"
        data-effect-preset={settings.preset}
        data-testid="graph-background-effects"
        style={{
          opacity: Math.max(0.08, Math.min(0.85, settings.intensity)),
          pointerEvents: 'none',
        }}
      >
        <span
          className="absolute -inset-24 block"
          style={{
            animation: 'cg-background-effects-drift 18s linear infinite',
            backgroundImage: PRESET_BACKGROUNDS[settings.preset],
            backgroundSize: '180px 180px, 260px 260px, 100% 100%',
          }}
        />
        <span
          className="absolute -inset-24 block"
          style={{
            animation: 'cg-background-effects-drift 28s linear infinite reverse',
            backgroundImage: PRESET_BACKGROUNDS[settings.preset],
            backgroundSize: '260px 260px, 360px 360px, 100% 100%',
            opacity: 0.55,
          }}
        />
      </div>
    </>
  );
}
