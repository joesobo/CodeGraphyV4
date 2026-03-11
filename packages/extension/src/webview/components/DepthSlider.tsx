/**
 * @fileoverview Depth slider component for the depth graph view.
 * Allows users to control how many hops from the focused node to display.
 * @module webview/components/DepthSlider
 */

import React from 'react';
import { postMessage } from '../lib/vscodeApi';

interface DepthSliderProps {
  depthLimit: number;
  onDepthChange?: (depth: number) => void;
}

/**
 * Slider component for controlling the depth limit in depth graph view.
 * 
 * @example
 * ```tsx
 * <DepthSlider
 *   depthLimit={2}
 *   onDepthChange={(depth) => console.log('Depth changed to', depth)}
 * />
 * ```
 */
export function DepthSlider({ depthLimit, onDepthChange }: DepthSliderProps): React.ReactElement {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newDepth = parseInt(event.target.value, 10);
    
    // Notify extension
    postMessage({ type: 'CHANGE_DEPTH_LIMIT', payload: { depthLimit: newDepth } });
    
    // Notify local handler if provided
    onDepthChange?.(newDepth);
  };

  return (
    <div className="depth-slider flex items-center gap-2">
      <label htmlFor="depth-slider" className="text-sm text-[var(--vscode-foreground,#cccccc)] whitespace-nowrap">
        Depth:
      </label>
      <input
        id="depth-slider"
        type="range"
        min="1"
        max="5"
        value={depthLimit}
        onChange={handleChange}
        className="w-16 h-1 bg-[var(--vscode-scrollbarSlider-background,#79797966)] rounded-lg appearance-none cursor-pointer accent-[var(--vscode-focusBorder,#007fd4)]"
        title={`Depth limit: ${depthLimit} ${depthLimit === 1 ? 'hop' : 'hops'}`}
      />
      <span className="text-sm text-[var(--vscode-foreground,#cccccc)] min-w-[1.5rem] text-center">
        {depthLimit}
      </span>
    </div>
  );
}
