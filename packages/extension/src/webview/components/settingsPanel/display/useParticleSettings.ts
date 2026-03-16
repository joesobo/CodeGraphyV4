import { useEffect, useRef } from 'react';
import { postMessage } from '../../../vscodeApi';
import { particleSpeedFromDisplay } from './model';
import {
  clearTimeoutMap,
  flushPendingNumber,
  schedulePendingNumber,
  type PendingNumberMap,
  type TimeoutMap,
} from './timers';

const PARTICLE_PERSIST_DEBOUNCE_MS = 350;

type ParticleSettingKey = 'particleSpeed' | 'particleSize';
const PARTICLE_SPEED_KEY: ParticleSettingKey = 'particleSpeed';
const PARTICLE_SIZE_KEY: ParticleSettingKey = 'particleSize';

type UseParticleSettingsProps = {
  setParticleSize: (size: number) => void;
  setParticleSpeed: (speed: number) => void;
};

export function useParticleSettings({
  setParticleSize,
  setParticleSpeed,
}: UseParticleSettingsProps): {
  onParticleSizeChange: (value: number) => void;
  onParticleSizeCommit: () => void;
  onParticleSpeedChange: (level: number) => void;
  onParticleSpeedCommit: () => void;
} {
  const pendingParticleValuesRef = useRef<PendingNumberMap<ParticleSettingKey>>({});
  const particlePersistTimersRef = useRef<TimeoutMap<ParticleSettingKey>>({});

  useEffect(() => {
    const particleTimers = particlePersistTimersRef.current;
    return () => {
      clearTimeoutMap(particleTimers);
    };
  }, []);

  const flushParticleSetting = (key: ParticleSettingKey) => {
    flushPendingNumber(
      pendingParticleValuesRef.current,
      particlePersistTimersRef.current,
      key,
      (settingKey, value) => {
        postMessage({
          type: 'UPDATE_PARTICLE_SETTING',
          payload: { key: settingKey, value },
        });
      },
    );
  };

  const scheduleParticleSettingPersist = (key: ParticleSettingKey, value: number) => {
    schedulePendingNumber(
      pendingParticleValuesRef.current,
      particlePersistTimersRef.current,
      key,
      value,
      PARTICLE_PERSIST_DEBOUNCE_MS,
      flushParticleSetting,
    );
  };

  const onParticleSpeedChange = (level: number) => {
    const normalized = particleSpeedFromDisplay(level);
    setParticleSpeed(normalized);
    scheduleParticleSettingPersist(PARTICLE_SPEED_KEY, normalized);
  };

  const onParticleSizeChange = (value: number) => {
    setParticleSize(value);
    scheduleParticleSettingPersist(PARTICLE_SIZE_KEY, value);
  };

  return {
    onParticleSizeChange,
    onParticleSizeCommit: () => flushParticleSetting(PARTICLE_SIZE_KEY),
    onParticleSpeedChange,
    onParticleSpeedCommit: () => flushParticleSetting(PARTICLE_SPEED_KEY),
  };
}
