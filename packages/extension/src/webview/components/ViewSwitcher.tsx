/**
 * @fileoverview View switcher dropdown component.
 * Allows users to switch between available graph views.
 * @module webview/components/ViewSwitcher
 */

import React from 'react';
import { IAvailableView } from '../../shared/types';
import { postMessage } from '../lib/vscodeApi';
import { mdiChevronDown } from '@mdi/js';
import { MdiIcon } from './icons';

interface ViewSwitcherProps {
  views: IAvailableView[];
  activeViewId: string;
  onViewChange?: (viewId: string) => void;
}

/**
 * Dropdown component for switching between graph views.
 * 
 * @example
 * ```tsx
 * <ViewSwitcher
 *   views={availableViews}
 *   activeViewId="codegraphy.connections"
 *   onViewChange={(id) => console.log('Switched to', id)}
 * />
 * ```
 */
export function ViewSwitcher({ views, activeViewId, onViewChange }: ViewSwitcherProps): React.ReactElement | null {
  // Don't render if there's only one view or no views
  if (views.length <= 1) {
    return null;
  }

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const viewId = event.target.value;
    
    // Notify extension
    postMessage({ type: 'CHANGE_VIEW', payload: { viewId } });
    
    // Notify local handler if provided
    onViewChange?.(viewId);
  };

  const activeView = views.find(view => view.id === activeViewId);

  return (
    <div className="view-switcher flex items-center gap-2">
      <label htmlFor="view-select" className="sr-only">
        Select view
      </label>
      <div className="relative">
        <select
          id="view-select"
          value={activeViewId}
          onChange={handleChange}
          className="appearance-none bg-[var(--vscode-dropdown-background,#3c3c3c)] text-[var(--vscode-dropdown-foreground,#cccccc)] border border-[var(--vscode-dropdown-border,#3c3c3c)] rounded px-3 py-1 pr-8 text-sm cursor-pointer hover:bg-[var(--vscode-dropdown-hoverBackground,#505050)] focus:outline-none focus:ring-1 focus:ring-[var(--vscode-focusBorder,#007fd4)]"
          title={activeView?.description || 'Select view'}
        >
          {views.map(view => (
            <option key={view.id} value={view.id} title={view.description}>
              {view.name}
            </option>
          ))}
        </select>
        {/* Dropdown arrow icon */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--vscode-dropdown-foreground,#cccccc)]">
          <MdiIcon path={mdiChevronDown} size={16} />
        </div>
      </div>
    </div>
  );
}
