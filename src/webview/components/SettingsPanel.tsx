/**
 * @fileoverview Settings panel with four collapsible accordion sections:
 * Forces, Groups, Filters, and Display.
 * @module webview/components/SettingsPanel
 */

import React, { useState, useRef, useEffect } from 'react';
import { IPhysicsSettings, IGroup, NodeSizeMode, IAvailableView } from '../../shared/types';
import { postMessage } from '../lib/vscodeApi';

interface SettingsPanelProps {
  // Forces
  settings: IPhysicsSettings;
  onSettingsChange?: (settings: IPhysicsSettings) => void;
  // Groups
  groups: IGroup[];
  onGroupsChange: (groups: IGroup[]) => void;
  // Filters
  filterPatterns: string[];
  onFilterPatternsChange: (patterns: string[]) => void;
  pluginFilterPatterns: string[];
  showOrphans: boolean;
  onShowOrphansChange: (showOrphans: boolean) => void;
  // Display
  nodeSizeMode: NodeSizeMode;
  onNodeSizeModeChange: (mode: NodeSizeMode) => void;
  availableViews: IAvailableView[];
  activeViewId: string;
  onViewChange: (viewId: string) => void;
  depthLimit: number;
  showArrows: boolean;
  onShowArrowsChange: (show: boolean) => void;
  showLabels: boolean;
  onShowLabelsChange: (show: boolean) => void;
  graphMode: '2d' | '3d';
  onGraphModeChange: (mode: '2d' | '3d') => void;
}



const NODE_SIZE_OPTIONS: { value: NodeSizeMode; label: string }[] = [
  { value: 'connections', label: 'Connections' },
  { value: 'file-size', label: 'File Size' },
  { value: 'access-count', label: 'Access Count' },
  { value: 'uniform', label: 'Uniform' },
];

/** Delay before persisting slider updates to VS Code settings. */
const PHYSICS_PERSIST_DEBOUNCE_MS = 350;

/** Chevron icon pointing down (open) or right (closed) */
function ChevronIcon({ open }: { open: boolean }): React.ReactElement {
  return (
    <svg
      className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${open ? 'rotate-90' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

/** Accordion section header */
function SectionHeader({
  title,
  open,
  onToggle,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
}): React.ReactElement {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between py-2 px-1 text-left hover:bg-zinc-700/40 rounded transition-colors"
    >
      <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">{title}</span>
      <ChevronIcon open={open} />
    </button>
  );
}

export default function SettingsPanel({
  settings,
  onSettingsChange,
  groups,
  onGroupsChange,
  filterPatterns,
  onFilterPatternsChange,
  pluginFilterPatterns,
  showOrphans,
  onShowOrphansChange,
  nodeSizeMode,
  onNodeSizeModeChange,
  availableViews,
  activeViewId,
  onViewChange,
  depthLimit,
  showArrows,
  onShowArrowsChange,
  showLabels,
  onShowLabelsChange,
  graphMode,
  onGraphModeChange,
}: SettingsPanelProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [forcesOpen, setForcesOpen] = useState(true);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [displayOpen, setDisplayOpen] = useState(false);

  // Groups form state
  const [newPattern, setNewPattern] = useState('');
  const [newColor, setNewColor] = useState('#3B82F6');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Filters form state
  const [newFilterPattern, setNewFilterPattern] = useState('');

  const pendingPhysicsValuesRef = useRef<Partial<Record<keyof IPhysicsSettings, number>>>({});
  const physicsPersistTimersRef = useRef<Partial<Record<keyof IPhysicsSettings, ReturnType<typeof setTimeout>>>>({});

  // Groups handlers
  const handleAddGroup = () => {
    if (!newPattern.trim()) return;
    const updated: IGroup[] = [
      ...groups,
      { id: crypto.randomUUID(), pattern: newPattern.trim(), color: newColor },
    ];
    onGroupsChange(updated);
    postMessage({ type: 'UPDATE_GROUPS', payload: { groups: updated } });
    setNewPattern('');
    setNewColor('#3B82F6');
  };

  const handleDeleteGroup = (id: string) => {
    const updated = groups.filter(g => g.id !== id);
    onGroupsChange(updated);
    postMessage({ type: 'UPDATE_GROUPS', payload: { groups: updated } });
  };

  const handleGroupDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleGroupDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleGroupDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const updated = [...groups];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(targetIndex, 0, moved);
    onGroupsChange(updated);
    postMessage({ type: 'UPDATE_GROUPS', payload: { groups: updated } });
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleGroupDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // Filters handlers
  const handleShowOrphansToggle = () => {
    const next = !showOrphans;
    onShowOrphansChange(next);
    postMessage({ type: 'UPDATE_SHOW_ORPHANS', payload: { showOrphans: next } });
  };

  const handleAddFilterPattern = () => {
    if (!newFilterPattern.trim()) return;
    const updated = [...filterPatterns, newFilterPattern.trim()];
    onFilterPatternsChange(updated);
    postMessage({ type: 'UPDATE_FILTER_PATTERNS', payload: { patterns: updated } });
    setNewFilterPattern('');
  };

  const handleDeleteFilterPattern = (pattern: string) => {
    const updated = filterPatterns.filter(p => p !== pattern);
    onFilterPatternsChange(updated);
    postMessage({ type: 'UPDATE_FILTER_PATTERNS', payload: { patterns: updated } });
  };

  // Forces handlers
  const flushPhysicsSetting = (key: keyof IPhysicsSettings) => {
    const pendingValue = pendingPhysicsValuesRef.current[key];
    if (pendingValue === undefined) return;

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

  useEffect(() => {
    return () => {
      for (const timer of Object.values(physicsPersistTimersRef.current)) {
        if (timer) clearTimeout(timer);
      }
    };
  }, []);

  const handlePhysicsChange = (key: keyof IPhysicsSettings, value: number) => {
    const updated = { ...settings, [key]: value };
    onSettingsChange?.(updated);
    schedulePhysicsSettingPersist(key, value);
  };

  // Display handlers
  const handleShowArrowsChange = (checked: boolean) => {
    onShowArrowsChange(checked);
    postMessage({ type: 'UPDATE_SHOW_ARROWS', payload: { showArrows: checked } });
  };

  const handleViewChange = (viewId: string) => {
    onViewChange(viewId);
    postMessage({ type: 'CHANGE_VIEW', payload: { viewId } });
  };

  const handleDepthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newDepth = parseInt(event.target.value, 10);
    postMessage({ type: 'CHANGE_DEPTH_LIMIT', payload: { depthLimit: newDepth } });
  };

  const handleManualRefresh = () => {
    postMessage({ type: 'REFRESH_GRAPH' });
  };

  return (
    <div className="absolute bottom-2 right-2 z-10">
      {isOpen ? (
        <div className="bg-zinc-800/95 backdrop-blur-sm rounded-lg border border-zinc-700 w-72 shadow-lg max-h-[calc(100vh-4rem)] flex flex-col">
          {/* Panel header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700 flex-shrink-0">
            <span className="text-sm font-medium text-zinc-200">Settings</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-zinc-400 hover:text-zinc-200 p-1"
              title="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1 px-3 pb-3">

            {/* Forces section */}
            <SectionHeader title="Forces" open={forcesOpen} onToggle={() => setForcesOpen(v => !v)} />
            {forcesOpen && (
              <div className="mb-2 space-y-3 pt-1">
                {/* Repel Force */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-zinc-300">Repel Force</span>
                    <span className="text-xs text-zinc-400 font-mono">{settings.repelForce}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="1"
                    value={settings.repelForce}
                    onChange={e => handlePhysicsChange('repelForce', Number(e.target.value))}
                    onMouseUp={() => flushPhysicsSetting('repelForce')}
                    onTouchEnd={() => flushPhysicsSetting('repelForce')}
                    onBlur={() => flushPhysicsSetting('repelForce')}
                    className="w-full h-1.5 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
                {/* Center Force */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-zinc-300" title="Pulls nodes toward the graph's origin point (0,0 in simulation space). Higher values keep the graph compact and centered; 0 disables the force.">Center Force</span>
                    <span className="text-xs text-zinc-400 font-mono">{settings.centerForce.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={settings.centerForce}
                    onChange={e => handlePhysicsChange('centerForce', Number(e.target.value))}
                    onMouseUp={() => flushPhysicsSetting('centerForce')}
                    onTouchEnd={() => flushPhysicsSetting('centerForce')}
                    onBlur={() => flushPhysicsSetting('centerForce')}
                    className="w-full h-1.5 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
                {/* Link Distance */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-zinc-300">Link Distance</span>
                    <span className="text-xs text-zinc-400 font-mono">{settings.linkDistance}</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="500"
                    step="10"
                    value={settings.linkDistance}
                    onChange={e => handlePhysicsChange('linkDistance', Number(e.target.value))}
                    onMouseUp={() => flushPhysicsSetting('linkDistance')}
                    onTouchEnd={() => flushPhysicsSetting('linkDistance')}
                    onBlur={() => flushPhysicsSetting('linkDistance')}
                    className="w-full h-1.5 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
                {/* Link Force */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-zinc-300">Link Force</span>
                    <span className="text-xs text-zinc-400 font-mono">{settings.linkForce.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={settings.linkForce}
                    onChange={e => handlePhysicsChange('linkForce', Number(e.target.value))}
                    onMouseUp={() => flushPhysicsSetting('linkForce')}
                    onTouchEnd={() => flushPhysicsSetting('linkForce')}
                    onBlur={() => flushPhysicsSetting('linkForce')}
                    className="w-full h-1.5 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Groups section */}
            <SectionHeader title="Groups" open={groupsOpen} onToggle={() => setGroupsOpen(v => !v)} />
            {groupsOpen && (
              <div className="mb-2 space-y-2">
                {/* Existing groups */}
                {groups.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-1">No groups. All nodes use the default grey color.</p>
                ) : (
                  <ul className="space-y-1">
                    {groups.map((group, index) => (
                      <li
                        key={group.id}
                        draggable
                        onDragStart={() => handleGroupDragStart(index)}
                        onDragOver={(e) => handleGroupDragOver(e, index)}
                        onDrop={(e) => handleGroupDrop(e, index)}
                        onDragEnd={handleGroupDragEnd}
                        className={`flex items-center gap-2 rounded transition-colors ${
                          dragOverIndex === index && dragIndex !== index
                            ? 'bg-zinc-700/60 outline outline-1 outline-blue-500/50'
                            : dragIndex === index
                            ? 'opacity-40'
                            : ''
                        }`}
                      >
                        {/* Drag handle */}
                        <svg className="w-3 h-3 text-zinc-600 flex-shrink-0 cursor-grab active:cursor-grabbing" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm8 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm8 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 22a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm8 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
                        </svg>
                        <span
                          className="w-4 h-4 rounded-sm flex-shrink-0 border border-zinc-600"
                          style={{ backgroundColor: group.color }}
                        />
                        <span className="text-xs text-zinc-300 flex-1 truncate font-mono">{group.pattern}</span>
                        <button
                          onClick={() => handleDeleteGroup(group.id)}
                          className="text-zinc-500 hover:text-red-400 flex-shrink-0"
                          title="Delete group"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {/* Add group form */}
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="text"
                    value={newPattern}
                    onChange={e => setNewPattern(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddGroup()}
                    placeholder="src/**"
                    className="flex-1 bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 min-w-0"
                  />
                  <input
                    type="color"
                    value={newColor}
                    onChange={e => setNewColor(e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0"
                    title="Pick color"
                  />
                  <button
                    onClick={handleAddGroup}
                    disabled={!newPattern.trim()}
                    className="text-xs text-zinc-200 bg-zinc-700 hover:bg-zinc-600 border border-zinc-600 rounded px-2 py-1 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* Filters section */}
            <SectionHeader title="Filters" open={filtersOpen} onToggle={() => setFiltersOpen(v => !v)} />
            {filtersOpen && (
              <div className="mb-2 space-y-2">
                {/* Show Orphans toggle */}
                <div className="flex items-center justify-between py-0.5">
                  <label className="text-xs text-zinc-300">Show Orphans</label>
                  <button
                    onClick={handleShowOrphansToggle}
                    className={`relative w-8 h-4.5 rounded-full transition-colors ${showOrphans ? 'bg-blue-500' : 'bg-zinc-600'}`}
                    role="switch"
                    aria-checked={showOrphans}
                  >
                    <span
                      className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${showOrphans ? 'translate-x-4' : 'translate-x-0.5'}`}
                    />
                  </button>
                </div>

                {/* Plugin default filter patterns (read-only) */}
                {pluginFilterPatterns.length > 0 && (
                  <>
                    <p className="text-xs text-zinc-500">Plugin defaults (read-only)</p>
                    <ul className="space-y-1">
                      {pluginFilterPatterns.map(pattern => (
                        <li key={pattern} className="flex items-center gap-2 opacity-60">
                          <svg className="w-3 h-3 text-zinc-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          <span className="text-xs text-zinc-400 flex-1 truncate font-mono">{pattern}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {/* User blacklist patterns */}
                <p className="text-xs text-zinc-500">Custom (exclude from graph)</p>
                {filterPatterns.length === 0 ? (
                  <p className="text-xs text-zinc-500">No patterns.</p>
                ) : (
                  <ul className="space-y-1">
                    {filterPatterns.map(pattern => (
                      <li key={pattern} className="flex items-center gap-2">
                        <span className="text-xs text-zinc-300 flex-1 truncate font-mono">{pattern}</span>
                        <button
                          onClick={() => handleDeleteFilterPattern(pattern)}
                          className="text-zinc-500 hover:text-red-400 flex-shrink-0"
                          title="Delete pattern"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="text"
                    value={newFilterPattern}
                    onChange={e => setNewFilterPattern(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddFilterPattern()}
                    placeholder="*.png"
                    className="flex-1 bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 min-w-0"
                  />
                  <button
                    onClick={handleAddFilterPattern}
                    disabled={!newFilterPattern.trim()}
                    className="text-xs text-zinc-200 bg-zinc-700 hover:bg-zinc-600 border border-zinc-600 rounded px-2 py-1 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* Display section */}
            <SectionHeader title="Display" open={displayOpen} onToggle={() => setDisplayOpen(v => !v)} />
            {displayOpen && (
              <div className="mb-2 space-y-3">
                {/* Arrows toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showArrows}
                    onChange={e => handleShowArrowsChange(e.target.checked)}
                    className="accent-blue-500"
                  />
                  <span className="text-xs text-zinc-300">Show Arrows</span>
                </label>

                {/* Labels toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showLabels}
                    onChange={e => onShowLabelsChange(e.target.checked)}
                    className="accent-blue-500"
                  />
                  <span className="text-xs text-zinc-300">Show Labels</span>
                </label>

                {/* Graph Mode */}
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-xs text-zinc-300">Graph Mode</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onGraphModeChange('2d')}
                      className={`text-xs px-2 py-0.5 rounded transition-colors ${graphMode === '2d' ? 'bg-blue-500 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}
                    >
                      2D
                    </button>
                    <button
                      onClick={() => onGraphModeChange('3d')}
                      className={`text-xs px-2 py-0.5 rounded transition-colors ${graphMode === '3d' ? 'bg-blue-500 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}
                    >
                      3D
                    </button>
                  </div>
                </div>

                {/* Node Size */}
                <div>
                  <p className="text-xs text-zinc-400 mb-1.5">Node Size</p>
                  <div className="space-y-1">
                    {NODE_SIZE_OPTIONS.map(opt => (
                      <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="nodeSizeMode"
                          value={opt.value}
                          checked={nodeSizeMode === opt.value}
                          onChange={() => onNodeSizeModeChange(opt.value)}
                          className="accent-blue-500"
                        />
                        <span className="text-xs text-zinc-300">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* View */}
                {availableViews.length > 0 && (
                  <div>
                    <p className="text-xs text-zinc-400 mb-1.5">View</p>
                    <div className="space-y-1">
                      {availableViews.map(view => (
                        <label key={view.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="activeView"
                            value={view.id}
                            checked={activeViewId === view.id}
                            onChange={() => handleViewChange(view.id)}
                            className="accent-blue-500"
                          />
                          <span className="text-xs text-zinc-300">{view.name}</span>
                        </label>
                      ))}
                    </div>
                    {/* Inline depth slider when Depth Graph is selected */}
                    {activeViewId === 'codegraphy.depth-graph' && (
                      <div className="flex items-center gap-2 mt-2 pl-4">
                        <label className="text-xs text-zinc-400">Depth:</label>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          value={depthLimit}
                          onChange={handleDepthChange}
                          className="w-20 h-1.5 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <span className="text-xs text-zinc-400 min-w-[1rem] text-center">{depthLimit}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleManualRefresh}
            className="bg-zinc-800/80 hover:bg-zinc-700/90 backdrop-blur-sm rounded-lg border border-zinc-700 p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Reset Graph"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 20v-6h-6" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 10A8 8 0 0010 4M4 14a8 8 0 0010 6" />
            </svg>
          </button>
          <button
            onClick={() => setIsOpen(true)}
            className="bg-zinc-800/80 hover:bg-zinc-700/90 backdrop-blur-sm rounded-lg border border-zinc-700 p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
