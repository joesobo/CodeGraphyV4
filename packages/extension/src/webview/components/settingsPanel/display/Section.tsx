import React, { useEffect, useRef } from 'react';
import {
  type BidirectionalEdgeMode,
  DEFAULT_DIRECTION_COLOR,
  DEFAULT_FOLDER_NODE_COLOR,
  type DirectionMode,
} from '../../../../shared/types';
import { postMessage } from '../../../lib/vscodeApi';
import { useGraphStore } from '../../../store';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Slider } from '../../ui/slider';
import { Switch } from '../../ui/switch';
import {
  getSettingsToggleButtonState,
  particleSpeedFromDisplay,
  particleSpeedToDisplay,
  resolveDisplayColor,
  shouldShowFolderNodeColor,
  shouldShowParticleControls,
} from './model';
import {
  clearTimeoutMap,
  flushPendingNumber,
  schedulePendingNumber,
  type PendingNumberMap,
  type TimeoutMap,
} from './timers';

const PARTICLE_PERSIST_DEBOUNCE_MS = 350;
const COLOR_PERSIST_DEBOUNCE_MS = 150;

type ParticleSettingKey = 'particleSpeed' | 'particleSize';
const PARTICLE_SPEED_KEY: ParticleSettingKey = 'particleSpeed';
const PARTICLE_SIZE_KEY: ParticleSettingKey = 'particleSize';

export function DisplaySection(): React.ReactElement {
  const bidirectionalMode = useGraphStore((state) => state.bidirectionalMode);
  const setBidirectionalMode = useGraphStore((state) => state.setBidirectionalMode);
  const directionMode = useGraphStore((state) => state.directionMode);
  const directionColor = useGraphStore((state) => state.directionColor);
  const setDirectionMode = useGraphStore((state) => state.setDirectionMode);
  const setDirectionColor = useGraphStore((state) => state.setDirectionColor);
  const particleSpeed = useGraphStore((state) => state.particleSpeed);
  const setParticleSpeed = useGraphStore((state) => state.setParticleSpeed);
  const particleSize = useGraphStore((state) => state.particleSize);
  const setParticleSize = useGraphStore((state) => state.setParticleSize);
  const showLabels = useGraphStore((state) => state.showLabels);
  const setShowLabels = useGraphStore((state) => state.setShowLabels);
  const activeViewId = useGraphStore((state) => state.activeViewId);
  const folderNodeColor = useGraphStore((state) => state.folderNodeColor);
  const setFolderNodeColor = useGraphStore((state) => state.setFolderNodeColor);

  const pendingParticleValuesRef = useRef<PendingNumberMap<ParticleSettingKey>>({});
  const particlePersistTimersRef = useRef<TimeoutMap<ParticleSettingKey>>({});
  const directionColorTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const folderColorTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const particleTimers = particlePersistTimersRef.current;
    const directionColorTimer = directionColorTimerRef;
    const folderColorTimer = folderColorTimerRef;
    return () => {
      clearTimeoutMap(particleTimers);
      clearTimeout(directionColorTimer.current);
      clearTimeout(folderColorTimer.current);
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
      }
    );
  };

  const scheduleParticleSettingPersist = (key: ParticleSettingKey, value: number) => {
    schedulePendingNumber(
      pendingParticleValuesRef.current,
      particlePersistTimersRef.current,
      key,
      value,
      PARTICLE_PERSIST_DEBOUNCE_MS,
      flushParticleSetting
    );
  };

  const handleBidirectionalModeChange = (mode: BidirectionalEdgeMode) => {
    setBidirectionalMode(mode);
    postMessage({ type: 'UPDATE_BIDIRECTIONAL_MODE', payload: { bidirectionalMode: mode } });
  };

  const handleDirectionModeChange = (mode: DirectionMode) => {
    setDirectionMode(mode);
    postMessage({ type: 'UPDATE_DIRECTION_MODE', payload: { directionMode: mode } });
  };

  const handleDirectionColorChange = (value: string) => {
    const normalized = value.toUpperCase();
    setDirectionColor(normalized);
    clearTimeout(directionColorTimerRef.current);
    directionColorTimerRef.current = setTimeout(() => {
      postMessage({ type: 'UPDATE_DIRECTION_COLOR', payload: { directionColor: normalized } });
    }, COLOR_PERSIST_DEBOUNCE_MS);
  };

  const handleFolderNodeColorChange = (value: string) => {
    const normalized = value.toUpperCase();
    setFolderNodeColor(normalized);
    clearTimeout(folderColorTimerRef.current);
    folderColorTimerRef.current = setTimeout(() => {
      postMessage({ type: 'UPDATE_FOLDER_NODE_COLOR', payload: { folderNodeColor: normalized } });
    }, COLOR_PERSIST_DEBOUNCE_MS);
  };

  const handleParticleSpeedChange = (level: number) => {
    const normalized = particleSpeedFromDisplay(level);
    setParticleSpeed(normalized);
    scheduleParticleSettingPersist(PARTICLE_SPEED_KEY, normalized);
  };

  const handleParticleSizeChange = (value: number) => {
    setParticleSize(value);
    scheduleParticleSettingPersist(PARTICLE_SIZE_KEY, value);
  };

  const handleShowLabelsChange = (checked: boolean) => {
    setShowLabels(checked);
    postMessage({ type: 'UPDATE_SHOW_LABELS', payload: { showLabels: checked } });
  };

  const resolvedDirectionColor = resolveDisplayColor(directionColor, DEFAULT_DIRECTION_COLOR);
  const resolvedFolderNodeColor = resolveDisplayColor(folderNodeColor, DEFAULT_FOLDER_NODE_COLOR);
  const displayParticleSpeed = particleSpeedToDisplay(particleSpeed);
  const arrowsButton = getSettingsToggleButtonState(directionMode, 'arrows');
  const particlesButton = getSettingsToggleButtonState(directionMode, 'particles');
  const noneButton = getSettingsToggleButtonState(directionMode, 'none');
  const separateButton = getSettingsToggleButtonState(bidirectionalMode, 'separate');
  const combinedButton = getSettingsToggleButtonState(bidirectionalMode, 'combined');

  return (
    <div className="mb-2 space-y-3">
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Direction</Label>
        <div className="flex gap-1">
          <Button
            aria-pressed={arrowsButton.pressed}
            variant={arrowsButton.variant}
            size="sm"
            className="h-6 px-2 text-xs flex-1"
            onClick={() => handleDirectionModeChange('arrows')}
          >
            Arrows
          </Button>
          <Button
            aria-pressed={particlesButton.pressed}
            variant={particlesButton.variant}
            size="sm"
            className="h-6 px-2 text-xs flex-1"
            onClick={() => handleDirectionModeChange('particles')}
          >
            Particles
          </Button>
          <Button
            aria-pressed={noneButton.pressed}
            variant={noneButton.variant}
            size="sm"
            className="h-6 px-2 text-xs flex-1"
            onClick={() => handleDirectionModeChange('none')}
          >
            None
          </Button>
        </div>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Bidirectional Edges</Label>
        <div className="flex gap-1">
          <Button
            aria-pressed={separateButton.pressed}
            variant={separateButton.variant}
            size="sm"
            className="h-6 px-2 text-xs flex-1"
            onClick={() => handleBidirectionalModeChange('separate')}
          >
            Separate
          </Button>
          <Button
            aria-pressed={combinedButton.pressed}
            variant={combinedButton.variant}
            size="sm"
            className="h-6 px-2 text-xs flex-1"
            onClick={() => handleBidirectionalModeChange('combined')}
          >
            Combined
          </Button>
        </div>
      </div>

      <div>
        <Label htmlFor="direction-color" className="text-xs text-muted-foreground mb-1.5 block">
          Direction Color
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="direction-color"
            type="color"
            value={resolvedDirectionColor}
            onChange={(event) => handleDirectionColorChange(event.target.value)}
            className="h-7 w-10 p-1"
          />
          <span className="text-[11px] text-muted-foreground font-mono flex-1">
            {resolvedDirectionColor}
          </span>
        </div>
      </div>

      {shouldShowFolderNodeColor(activeViewId) && (
        <div>
          <Label htmlFor="folder-node-color" className="text-xs text-muted-foreground mb-1.5 block">
            Folder Node Color
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="folder-node-color"
              type="color"
              value={resolvedFolderNodeColor}
              onChange={(event) => handleFolderNodeColorChange(event.target.value)}
              className="h-7 w-10 p-1"
            />
            <span className="text-[11px] text-muted-foreground font-mono flex-1">
              {resolvedFolderNodeColor}
            </span>
          </div>
        </div>
      )}

      {shouldShowParticleControls(directionMode) && (
        <div className="space-y-3 pl-2 border-l border-border">
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs">Particle Speed</Label>
              <span className="text-xs text-muted-foreground font-mono">
                {Math.round(displayParticleSpeed)}
              </span>
            </div>
            <Slider
              min={1}
              max={10}
              step={1}
              value={[displayParticleSpeed]}
              onValueChange={(values) => handleParticleSpeedChange(values[0])}
              onValueCommit={() => flushParticleSetting(PARTICLE_SPEED_KEY)}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs">Particle Size</Label>
              <span className="text-xs text-muted-foreground font-mono">
                {particleSize.toFixed(1)}
              </span>
            </div>
            <Slider
              min={1}
              max={10}
              step={0.5}
              value={[particleSize]}
              onValueChange={(values) => handleParticleSizeChange(values[0])}
              onValueCommit={() => flushParticleSetting(PARTICLE_SIZE_KEY)}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Label htmlFor="show-labels" className="text-xs">
          Show Labels
        </Label>
        <Switch
          id="show-labels"
          checked={showLabels}
          onCheckedChange={handleShowLabelsChange}
        />
      </div>
    </div>
  );
}
