/**
 * @fileoverview Loading and empty state components for the App.
 * @module webview/appStates
 */

import React from 'react';
import { GraphIcon } from './components/icons';

export function LoadingState(): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="flex items-center gap-3 mb-4">
        <GraphIcon className="w-10 h-10 animate-pulse" />
        <h1 className="text-2xl font-bold text-primary">CodeGraphy</h1>
      </div>
      <p className="text-secondary">Loading graph...</p>
    </div>
  );
}

export function EmptyState({ hint }: { hint: string }): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="flex items-center gap-3 mb-4">
        <GraphIcon className="w-10 h-10" />
        <h1 className="text-2xl font-bold text-primary">CodeGraphy</h1>
      </div>
      <p className="text-secondary text-center">No files found. {hint}</p>
    </div>
  );
}
