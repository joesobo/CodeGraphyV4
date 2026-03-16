/**
 * @fileoverview Physics settings panel for graph simulation control.
 * @module webview/components/PhysicsSettings
 */

import React, { useState } from 'react';
import { IPhysicsSettings } from '../../shared/types';
import { postMessage } from '../vscodeApi';
import { mdiClose, mdiCogOutline } from '@mdi/js';
import { MdiIcon } from './icons';

interface PhysicsSettingsProps {
  settings: IPhysicsSettings;
  onSettingsChange?: (settings: IPhysicsSettings) => void;
}

interface SliderConfig {
  key: keyof IPhysicsSettings;
  label: string;
  min: number;
  max: number;
  step: number;
  description: string;
}

const SLIDERS: SliderConfig[] = [
  {
    key: 'repelForce',
    label: 'Repel Force',
    min: 0,
    max: 20,
    step: 1,
    description: 'Node repulsion (0 = none, 20 = max)',
  },
  {
    key: 'linkDistance',
    label: 'Link Distance',
    min: 30,
    max: 500,
    step: 10,
    description: 'Preferred distance between connected nodes',
  },
  {
    key: 'linkForce',
    label: 'Link Force',
    min: 0,
    max: 1,
    step: 0.01,
    description: 'Spring stiffness (0–1)',
  },
  {
    key: 'centerForce',
    label: 'Center Force',
    min: 0,
    max: 1,
    step: 0.01,
    description: 'Pull toward viewport center (0–1)',
  },
  {
    key: 'damping',
    label: 'Damping',
    min: 0,
    max: 1,
    step: 0.05,
    description: 'Motion settling speed',
  },
];

export default function PhysicsSettings({ settings, onSettingsChange }: PhysicsSettingsProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSliderChange = (key: keyof IPhysicsSettings, value: number) => {
    // Update local state for immediate feedback
    if (onSettingsChange) {
      onSettingsChange({ ...settings, [key]: value });
    }
    // Persist to VSCode settings
    postMessage({ type: 'UPDATE_PHYSICS_SETTING', payload: { key, value } });
  };

  const handleReset = () => {
    postMessage({ type: 'RESET_PHYSICS_SETTINGS' });
  };

  return (
    <div className="absolute bottom-2 right-2 z-10">
      {isExpanded ? (
        <div className="bg-zinc-800/95 backdrop-blur-sm rounded-lg border border-zinc-700 p-3 w-64 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-zinc-200">Physics Settings</span>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-zinc-400 hover:text-zinc-200 p-1"
              title="Close"
            >
              <MdiIcon path={mdiClose} size={16} />
            </button>
          </div>

          <div className="space-y-3">
            {SLIDERS.map(({ key, label, min, max, step, description }) => (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-zinc-300" title={description}>
                    {label}
                  </label>
                  <span className="text-xs text-zinc-500 font-mono">
                    {typeof settings[key] === 'number' ? settings[key].toFixed(step < 1 ? 2 : 0) : settings[key]}
                  </span>
                </div>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={settings[key]}
                  onChange={(e) => handleSliderChange(key, parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            ))}
          </div>

          <button
            onClick={handleReset}
            className="mt-3 w-full text-xs text-zinc-400 hover:text-zinc-200 py-1.5 border border-zinc-600 rounded hover:border-zinc-500 transition-colors"
          >
            Reset to Defaults
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-zinc-800/80 hover:bg-zinc-700/90 backdrop-blur-sm rounded-lg border border-zinc-700 p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
          title="Physics Settings"
        >
          <MdiIcon path={mdiCogOutline} size={20} />
        </button>
      )}
    </div>
  );
}
