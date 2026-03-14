import React, { useEffect, useRef } from 'react';
import { type IPhysicsSettings } from '../../../../shared/types';
import { postMessage } from '../../../lib/vscodeApi';
import { useGraphStore } from '../../../store';
import { Label } from '../../ui/label';
import { Slider } from '../../ui/slider';

const PHYSICS_PERSIST_DEBOUNCE_MS = 350;

function clearTimerRefs(
  ref: React.MutableRefObject<Partial<Record<keyof IPhysicsSettings, ReturnType<typeof setTimeout>>>>
): void {
  for (const timer of Object.values(ref.current)) {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export function ForcesSection(): React.ReactElement {
  const settings = useGraphStore((state) => state.physicsSettings);
  const setPhysicsSettings = useGraphStore((state) => state.setPhysicsSettings);
  const pendingPhysicsValuesRef = useRef<Partial<Record<keyof IPhysicsSettings, number>>>({});
  const physicsPersistTimersRef = useRef<
    Partial<Record<keyof IPhysicsSettings, ReturnType<typeof setTimeout>>>
  >({});

  useEffect(() => {
    return () => {
      clearTimerRefs(physicsPersistTimersRef);
    };
  }, []);

  const flushPhysicsSetting = (key: keyof IPhysicsSettings) => {
    const pendingValue = pendingPhysicsValuesRef.current[key];
    if (pendingValue === undefined) {
      return;
    }

    const timer = physicsPersistTimersRef.current[key];
    if (timer) {
      clearTimeout(timer);
      delete physicsPersistTimersRef.current[key];
    }

    delete pendingPhysicsValuesRef.current[key];
    postMessage({ type: 'UPDATE_PHYSICS_SETTING', payload: { key, value: pendingValue } });
  };

  const schedulePhysicsSettingPersist = (key: keyof IPhysicsSettings, value: number) => {
    pendingPhysicsValuesRef.current[key] = value;

    const existingTimer = physicsPersistTimersRef.current[key];
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    physicsPersistTimersRef.current[key] = setTimeout(() => {
      flushPhysicsSetting(key);
    }, PHYSICS_PERSIST_DEBOUNCE_MS);
  };

  const handlePhysicsChange = (key: keyof IPhysicsSettings, value: number) => {
    setPhysicsSettings({ ...settings, [key]: value });
    schedulePhysicsSettingPersist(key, value);
  };

  return (
    <div className="mb-2 space-y-3 pt-1">
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-xs">Repel Force</Label>
          <span className="text-xs text-muted-foreground font-mono">{settings.repelForce}</span>
        </div>
        <Slider
          data-testid="repel-force-slider"
          min={0}
          max={20}
          step={1}
          value={[settings.repelForce]}
          onValueChange={(values) => handlePhysicsChange('repelForce', values[0])}
          onValueCommit={() => flushPhysicsSetting('repelForce')}
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label
            className="text-xs"
            title="Pulls nodes toward the graph's origin point. Higher values keep the graph compact and centered; 0 disables the force."
          >
            Center Force
          </Label>
          <span className="text-xs text-muted-foreground font-mono">{settings.centerForce.toFixed(2)}</span>
        </div>
        <Slider
          data-testid="center-force-slider"
          min={0}
          max={1}
          step={0.01}
          value={[settings.centerForce]}
          onValueChange={(values) => handlePhysicsChange('centerForce', values[0])}
          onValueCommit={() => flushPhysicsSetting('centerForce')}
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-xs">Link Distance</Label>
          <span className="text-xs text-muted-foreground font-mono">{settings.linkDistance}</span>
        </div>
        <Slider
          data-testid="link-distance-slider"
          min={30}
          max={500}
          step={10}
          value={[settings.linkDistance]}
          onValueChange={(values) => handlePhysicsChange('linkDistance', values[0])}
          onValueCommit={() => flushPhysicsSetting('linkDistance')}
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-xs">Link Force</Label>
          <span className="text-xs text-muted-foreground font-mono">{settings.linkForce.toFixed(2)}</span>
        </div>
        <Slider
          data-testid="link-force-slider"
          min={0}
          max={1}
          step={0.01}
          value={[settings.linkForce]}
          onValueChange={(values) => handlePhysicsChange('linkForce', values[0])}
          onValueCommit={() => flushPhysicsSetting('linkForce')}
        />
      </div>
    </div>
  );
}
