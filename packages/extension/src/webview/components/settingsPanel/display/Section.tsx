import React from 'react';
import type { BidirectionalEdgeMode, DirectionMode } from '../../../../shared/settings/modes';
import { postMessage } from '../../../vscodeApi';
import { ColorField } from './ColorField';
import { LabelsToggle } from './LabelsToggle';
import { MaxFilesControl } from './MaxFilesControl';
import { ModeButtons } from './ModeButtons';
import { OrphansToggle } from './OrphansToggle';
import { Particles } from './Particles';
import { useColorUpdates } from './use/colorUpdates';
import { useDisplayStore } from './use/store';
import { useParticleSettings } from './use/particles';
import { getDisplayViewState } from './state/selectors';
import {
  decreaseMaxFiles,
  increaseMaxFiles,
  parseMaxFilesInput,
  clampMaxFiles,
} from './maxFiles';

export function DisplaySection(): React.ReactElement {
  const {
    bidirectionalMode,
    directionColor,
    directionMode,
    maxFiles,
    particleSize,
    particleSpeed,
    setBidirectionalMode,
    setDirectionColor,
    setDirectionMode,
    setMaxFiles,
    setParticleSize,
    setParticleSpeed,
    setShowLabels,
    setShowOrphans,
    showLabels,
    showOrphans,
  } = useDisplayStore();
  const {
    bidirectionalOptions,
    directionOptions,
    displayParticleSpeed,
    resolvedDirectionColor,
    showParticleControls,
  } = getDisplayViewState({
    bidirectionalMode,
    directionColor,
    directionMode,
    particleSpeed,
  });
  const { onDirectionColorChange } = useColorUpdates({
    setDirectionColor,
  });
  const {
    onParticleSizeChange,
    onParticleSizeCommit,
    onParticleSpeedChange,
    onParticleSpeedCommit,
  } = useParticleSettings({
    setParticleSize,
    setParticleSpeed,
  });

  const onBidirectionalModeChange = (mode: BidirectionalEdgeMode) => {
    setBidirectionalMode(mode);
    postMessage({ type: 'UPDATE_BIDIRECTIONAL_MODE', payload: { bidirectionalMode: mode } });
  };

  const onDirectionModeChange = (mode: DirectionMode) => {
    setDirectionMode(mode);
    postMessage({ type: 'UPDATE_DIRECTION_MODE', payload: { directionMode: mode } });
  };

  const onShowLabelsChange = (checked: boolean) => {
    setShowLabels(checked);
    postMessage({ type: 'UPDATE_SHOW_LABELS', payload: { showLabels: checked } });
  };

  const commitMaxFiles = (value: number) => {
    const clamped = clampMaxFiles(value);
    setMaxFiles(clamped);
    postMessage({ type: 'UPDATE_MAX_FILES', payload: { maxFiles: clamped } });
  };

  const onShowOrphansChange = (checked: boolean) => {
    setShowOrphans(checked);
    postMessage({ type: 'UPDATE_SHOW_ORPHANS', payload: { showOrphans: checked } });
  };

  return (
    <div className="mb-2 space-y-3">
      <ModeButtons
        label="Direction"
        onSelect={onDirectionModeChange}
        options={directionOptions}
      />

      <ModeButtons
        label="Bidirectional Edges"
        onSelect={onBidirectionalModeChange}
        options={bidirectionalOptions}
      />

      <ColorField
        id="direction-color"
        label="Direction Color"
        onChange={onDirectionColorChange}
        value={resolvedDirectionColor}
      />

      <OrphansToggle
        onCheckedChange={onShowOrphansChange}
        showOrphans={showOrphans}
      />

      <MaxFilesControl
        maxFiles={maxFiles}
        onBlur={(value) => commitMaxFiles(parseMaxFilesInput(value) ?? 1)}
        onChange={(value) => {
          const parsed = parseMaxFilesInput(value);
          if (parsed !== null) {
            setMaxFiles(parsed);
          }
        }}
        onDecrease={() => commitMaxFiles(decreaseMaxFiles(maxFiles))}
        onIncrease={() => commitMaxFiles(increaseMaxFiles(maxFiles))}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            commitMaxFiles(parseMaxFilesInput(event.currentTarget.value) ?? 1);
          }
        }}
      />

      {showParticleControls && (
        <Particles
          displayParticleSpeed={displayParticleSpeed}
          onParticleSizeChange={onParticleSizeChange}
          onParticleSizeCommit={onParticleSizeCommit}
          onParticleSpeedChange={onParticleSpeedChange}
          onParticleSpeedCommit={onParticleSpeedCommit}
          particleSize={particleSize}
        />
      )}

      <LabelsToggle checked={showLabels} onCheckedChange={onShowLabelsChange} />
    </div>
  );
}
