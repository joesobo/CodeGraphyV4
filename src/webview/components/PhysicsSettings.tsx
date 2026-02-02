/**
 * @fileoverview Physics settings panel for graph simulation control.
 * @module webview/components/PhysicsSettings
 */

import React, { useState } from 'react';
import { IPhysicsSettings, WebviewToExtensionMessage } from '../../shared/types';

// Get VSCode API - use lazy initialization to support testing
declare function acquireVsCodeApi(): {
  postMessage: (message: WebviewToExtensionMessage) => void;
};

let vscode: ReturnType<typeof acquireVsCodeApi> | null = null;
function getVsCodeApi() {
  if (vscode) return vscode;
  if (typeof acquireVsCodeApi !== 'undefined') {
    try {
      vscode = acquireVsCodeApi();
    } catch {
      // Already acquired
    }
  }
  return vscode;
}

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
    key: 'gravitationalConstant',
    label: 'Gravity',
    min: -500,
    max: 0,
    step: 10,
    description: 'Pull toward center',
  },
  {
    key: 'springLength',
    label: 'Link Distance',
    min: 10,
    max: 500,
    step: 10,
    description: 'Distance between nodes',
  },
  {
    key: 'springConstant',
    label: 'Link Strength',
    min: 0.01,
    max: 1,
    step: 0.01,
    description: 'Connection stiffness',
  },
  {
    key: 'centralGravity',
    label: 'Center Pull',
    min: 0,
    max: 1,
    step: 0.01,
    description: 'Pull toward viewport center',
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

function postMessage(message: WebviewToExtensionMessage): void {
  const api = getVsCodeApi();
  if (api) {
    api.postMessage(message);
  }
}

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
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
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
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      )}
    </div>
  );
}
