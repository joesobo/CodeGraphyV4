'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type ForceSettingKey = 'center' | 'distance' | 'link' | 'repel' | 'size';

export type ForceNodeSettings = Record<ForceSettingKey, number>;

export type NormalizedForceSettings = {
  centerPullMultiplier: number;
  centerStrength: number;
  collisionIterations: number;
  collisionPadding: number;
  distanceMultiplier: number;
  linkDistancePadding: number;
  linkStrengthMultiplier: number;
  repelStrength: number;
  sizeDistanceMultiplier: number;
  sizeMultiplier: number;
  sizeRepelMultiplier: number;
};

export const defaultForceNodeSettings: ForceNodeSettings = {
  center: 50,
  distance: 50,
  link: 50,
  repel: 50,
  size: 50,
};

type ForceNodeSettingsContextValue = {
  normalizedSettings: NormalizedForceSettings;
  resetSettings: () => void;
  settings: ForceNodeSettings;
  updateSetting: (key: ForceSettingKey, value: number) => void;
};

const ForceNodeSettingsContext = createContext<ForceNodeSettingsContextValue | null>(null);

function clampSliderValue(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scaleAroundDefault(
  value: number,
  {
    defaultOutput,
    defaultValue,
    max,
    min,
  }: {
    defaultOutput: number;
    defaultValue: number;
    max: number;
    min: number;
  },
): number {
  const clampedValue = clampSliderValue(value);

  if (clampedValue <= defaultValue) {
    return min + (clampedValue / defaultValue) * (defaultOutput - min);
  }

  return defaultOutput + ((clampedValue - defaultValue) / (100 - defaultValue)) * (max - defaultOutput);
}

export function normalizeForceSettings(settings: ForceNodeSettings): NormalizedForceSettings {
  const distanceSpacingMultiplier = scaleAroundDefault(settings.distance, {
    defaultOutput: 1,
    defaultValue: defaultForceNodeSettings.distance,
    max: 1.25,
    min: 0.25,
  });
  const sizeMultiplier = scaleAroundDefault(settings.size, {
    defaultOutput: 1,
    defaultValue: defaultForceNodeSettings.size,
    max: 3.9,
    min: 0.75,
  });
  const sizeGrowth = Math.max(0, sizeMultiplier - 1);

  return {
    centerPullMultiplier: scaleAroundDefault(settings.center, {
      defaultOutput: 1.045,
      defaultValue: defaultForceNodeSettings.center,
      max: 1.65,
      min: 0.55,
    }),
    centerStrength: scaleAroundDefault(settings.center, {
      defaultOutput: 0.025,
      defaultValue: defaultForceNodeSettings.center,
      max: 0.046,
      min: 0.008,
    }),
    collisionIterations: Math.round(2 + sizeGrowth * 2.4),
    collisionPadding: 4 + sizeGrowth * 8 * distanceSpacingMultiplier,
    distanceMultiplier: scaleAroundDefault(settings.distance, {
      defaultOutput: 1,
      defaultValue: defaultForceNodeSettings.distance,
      max: 2,
      min: 0.35,
    }),
    linkDistancePadding: 4 + sizeGrowth * 2 * distanceSpacingMultiplier,
    linkStrengthMultiplier: scaleAroundDefault(settings.link, {
      defaultOutput: 1,
      defaultValue: defaultForceNodeSettings.link,
      max: 6.7,
      min: 0,
    }),
    repelStrength: -scaleAroundDefault(settings.repel, {
      defaultOutput: 18,
      defaultValue: defaultForceNodeSettings.repel,
      max: 90,
      min: 6,
    }),
    sizeDistanceMultiplier: 1 + sizeGrowth * (0.15 + distanceSpacingMultiplier * 0.35),
    sizeMultiplier,
    sizeRepelMultiplier: 1 + sizeGrowth * (0.7 + distanceSpacingMultiplier * 0.65),
  };
}

export function ForceNodeSettingsProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [settings, setSettings] = useState<ForceNodeSettings>(defaultForceNodeSettings);
  const normalizedSettings = useMemo(() => normalizeForceSettings(settings), [settings]);
  const value = useMemo<ForceNodeSettingsContextValue>(
    () => ({
      normalizedSettings,
      resetSettings: () => {
        setSettings(defaultForceNodeSettings);
      },
      settings,
      updateSetting: (key, nextValue) => {
        setSettings(current => ({
          ...current,
          [key]: clampSliderValue(nextValue),
        }));
      },
    }),
    [normalizedSettings, settings],
  );

  return (
    <ForceNodeSettingsContext.Provider value={value}>
      {children}
    </ForceNodeSettingsContext.Provider>
  );
}

export function useForceNodeSettings(): ForceNodeSettingsContextValue {
  const context = useContext(ForceNodeSettingsContext);

  if (context === null) {
    throw new Error('useForceNodeSettings must be used inside ForceNodeSettingsProvider');
  }

  return context;
}
