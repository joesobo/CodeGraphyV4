import React, { useRef } from 'react';
import {
  GRAPH_PHYSICS_CONTROL_LIMITS,
  type GraphPhysicsSettings,
} from '@codegraphy-dev/graph-renderer/visuals';
import { postMessage } from '../../../vscodeApi';
import { useGraphStore } from '../../../store/state';
import { Label } from '../../ui/form/label';
import { Slider } from '../../ui/controls/slider';
import {
  clearPhysicsTimerMap,
  flushPendingPhysicsValue,
  schedulePendingPhysicsValue,
  type PendingPhysicsMap,
  type PhysicsTimerMap,
} from './persistence';

const PHYSICS_PERSIST_DEBOUNCE_MS = 350;

export function ForcesSection(): React.ReactElement {
  const settings = useGraphStore((state) => state.physicsSettings);
  const setPhysicsSettings = useGraphStore((state) => state.setPhysicsSettings);
  const pendingPhysicsValuesRef = useRef<PendingPhysicsMap>({});
  const physicsPersistTimersRef = useRef<PhysicsTimerMap>({});
  const cleanupRef = useRef<(node: HTMLElement | null) => void>((node) => {
    if (node === null) {
      clearPhysicsTimerMap(physicsPersistTimersRef.current);
    }
  });

  const flushPhysicsSetting = (key: keyof GraphPhysicsSettings) => {
    flushPendingPhysicsValue(
      pendingPhysicsValuesRef.current,
      physicsPersistTimersRef.current,
      key,
      (flushKey, value) => {
        postMessage({ type: 'UPDATE_PHYSICS_SETTING', payload: { key: flushKey, value } });
      },
    );
  };

  const schedulePhysicsSettingPersist = (key: keyof GraphPhysicsSettings, value: number) => {
    schedulePendingPhysicsValue(
      pendingPhysicsValuesRef.current,
      physicsPersistTimersRef.current,
      key,
      value,
      PHYSICS_PERSIST_DEBOUNCE_MS,
      flushPhysicsSetting,
    );
  };

  const handlePhysicsChange = (key: keyof GraphPhysicsSettings, value: number) => {
    setPhysicsSettings({ ...settings, [key]: value });
    schedulePhysicsSettingPersist(key, value);
  };

  return (
    <section
      className="mb-2 space-y-3 pt-1"
      data-codegraphy-section="settings-forces"
      ref={cleanupRef.current}
    >
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-xs">Repel Force</Label>
          <span className="text-xs text-muted-foreground font-mono">{settings.repelForce}</span>
        </div>
        <Slider
          data-testid="repel-force-slider"
          min={GRAPH_PHYSICS_CONTROL_LIMITS.repelForce.min}
          max={GRAPH_PHYSICS_CONTROL_LIMITS.repelForce.max}
          step={GRAPH_PHYSICS_CONTROL_LIMITS.repelForce.step}
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
          min={GRAPH_PHYSICS_CONTROL_LIMITS.centerForce.min}
          max={GRAPH_PHYSICS_CONTROL_LIMITS.centerForce.max}
          step={GRAPH_PHYSICS_CONTROL_LIMITS.centerForce.step}
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
          min={GRAPH_PHYSICS_CONTROL_LIMITS.linkDistance.min}
          max={GRAPH_PHYSICS_CONTROL_LIMITS.linkDistance.max}
          step={GRAPH_PHYSICS_CONTROL_LIMITS.linkDistance.step}
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
          min={GRAPH_PHYSICS_CONTROL_LIMITS.linkForce.min}
          max={GRAPH_PHYSICS_CONTROL_LIMITS.linkForce.max}
          step={GRAPH_PHYSICS_CONTROL_LIMITS.linkForce.step}
          value={[settings.linkForce]}
          onValueChange={(values) => handlePhysicsChange('linkForce', values[0])}
          onValueCommit={() => flushPhysicsSetting('linkForce')}
        />
      </div>
    </section>
  );
}
