/**
 * @fileoverview Settings panel with four collapsible accordion sections:
 * Forces, Groups, Filters, and Display.
 * @module webview/components/SettingsPanel
 */

import React, { useState, useRef, useEffect } from 'react';
import { IPhysicsSettings, NodeSizeMode } from '../../shared/types';
import { postMessage } from '../lib/vscodeApi';
import { useGraphStore } from '../store';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import { ScrollArea } from './ui/scroll-area';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const NODE_SIZE_OPTIONS: { value: NodeSizeMode; label: string }[] = [
  { value: 'connections', label: 'Connections' },
  { value: 'file-size', label: 'File Size' },
  { value: 'access-count', label: 'Access Count' },
  { value: 'uniform', label: 'Uniform' },
];

/** Delay before persisting slider updates to VS Code settings. */
const PHYSICS_PERSIST_DEBOUNCE_MS = 350;

function ChevronIcon({ open }: { open: boolean }): React.ReactElement {
  return (
    <svg
      className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', open && 'rotate-90')}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

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
      className="w-full flex items-center justify-between py-2 px-1 text-left hover:bg-accent rounded transition-colors"
    >
      <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
      <ChevronIcon open={open} />
    </button>
  );
}

export default function SettingsPanel({
  isOpen,
  onClose,
}: SettingsPanelProps): React.ReactElement | null {
  // Read state from store
  const settings = useGraphStore(s => s.physicsSettings);
  const setPhysicsSettings = useGraphStore(s => s.setPhysicsSettings);
  const groups = useGraphStore(s => s.groups);
  const setGroups = useGraphStore(s => s.setGroups);
  const filterPatterns = useGraphStore(s => s.filterPatterns);
  const setFilterPatterns = useGraphStore(s => s.setFilterPatterns);
  const pluginFilterPatterns = useGraphStore(s => s.pluginFilterPatterns);
  const showOrphans = useGraphStore(s => s.showOrphans);
  const setShowOrphans = useGraphStore(s => s.setShowOrphans);
  const nodeSizeMode = useGraphStore(s => s.nodeSizeMode);
  const setNodeSizeMode = useGraphStore(s => s.setNodeSizeMode);
  const availableViews = useGraphStore(s => s.availableViews);
  const activeViewId = useGraphStore(s => s.activeViewId);
  const setActiveViewId = useGraphStore(s => s.setActiveViewId);
  const depthLimit = useGraphStore(s => s.depthLimit);
  const directionMode = useGraphStore(s => s.directionMode);
  const setDirectionMode = useGraphStore(s => s.setDirectionMode);
  const showLabels = useGraphStore(s => s.showLabels);
  const setShowLabels = useGraphStore(s => s.setShowLabels);
  const graphMode = useGraphStore(s => s.graphMode);
  const setGraphMode = useGraphStore(s => s.setGraphMode);
  const maxFiles = useGraphStore(s => s.maxFiles);
  const setMaxFiles = useGraphStore(s => s.setMaxFiles);

  // Local UI state
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

  useEffect(() => {
    const timersRef = physicsPersistTimersRef;
    return () => {
      for (const timer of Object.values(timersRef.current)) {
        if (timer) clearTimeout(timer);
      }
    };
  }, []);

  if (!isOpen) return null;

  // Groups handlers
  const handleAddGroup = () => {
    if (!newPattern.trim()) return;
    const updated = [
      ...groups,
      { id: crypto.randomUUID(), pattern: newPattern.trim(), color: newColor },
    ];
    setGroups(updated);
    postMessage({ type: 'UPDATE_GROUPS', payload: { groups: updated } });
    setNewPattern('');
    setNewColor('#3B82F6');
  };

  const handleDeleteGroup = (id: string) => {
    const updated = groups.filter(g => g.id !== id);
    setGroups(updated);
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
    setGroups(updated);
    postMessage({ type: 'UPDATE_GROUPS', payload: { groups: updated } });
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleGroupDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // Filters handlers
  const handleShowOrphansToggle = (checked: boolean) => {
    setShowOrphans(checked);
    postMessage({ type: 'UPDATE_SHOW_ORPHANS', payload: { showOrphans: checked } });
  };

  const handleAddFilterPattern = () => {
    if (!newFilterPattern.trim()) return;
    const updated = [...filterPatterns, newFilterPattern.trim()];
    setFilterPatterns(updated);
    postMessage({ type: 'UPDATE_FILTER_PATTERNS', payload: { patterns: updated } });
    setNewFilterPattern('');
  };

  const handleDeleteFilterPattern = (pattern: string) => {
    const updated = filterPatterns.filter(p => p !== pattern);
    setFilterPatterns(updated);
    postMessage({ type: 'UPDATE_FILTER_PATTERNS', payload: { patterns: updated } });
  };

  // Max files handler
  const handleMaxFilesCommit = (value: number) => {
    const clamped = Math.max(1, value);
    setMaxFiles(clamped);
    postMessage({ type: 'UPDATE_MAX_FILES', payload: { maxFiles: clamped } });
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

  const handlePhysicsChange = (key: keyof IPhysicsSettings, value: number) => {
    const updated = { ...settings, [key]: value };
    setPhysicsSettings(updated);
    schedulePhysicsSettingPersist(key, value);
  };

  // Display handlers
  const handleShowArrowsChange = (checked: boolean) => {
    const mode = checked ? 'arrows' : 'none';
    setDirectionMode(mode);
    postMessage({ type: 'UPDATE_DIRECTION_MODE', payload: { directionMode: mode } });
  };

  const handleShowLabelsChange = (checked: boolean) => {
    setShowLabels(checked);
    postMessage({ type: 'UPDATE_SHOW_LABELS', payload: { showLabels: checked } });
  };

  const handleViewChange = (viewId: string) => {
    setActiveViewId(viewId);
    postMessage({ type: 'CHANGE_VIEW', payload: { viewId } });
  };

  const handleDepthChange = (value: number[]) => {
    const newDepth = value[0];
    postMessage({ type: 'CHANGE_DEPTH_LIMIT', payload: { depthLimit: newDepth } });
  };

  return (
    <div className="bg-popover/95 backdrop-blur-sm rounded-lg border w-72 shadow-lg max-h-full flex flex-col overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0">
        <span className="text-sm font-medium">Settings</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose} title="Close">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Button>
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 pb-3">

          {/* Forces section */}
          <SectionHeader title="Forces" open={forcesOpen} onToggle={() => setForcesOpen(v => !v)} />
          {forcesOpen && (
            <div className="mb-2 space-y-3 pt-1">
              {/* Repel Force */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs">Repel Force</Label>
                  <span className="text-xs text-muted-foreground font-mono">{settings.repelForce}</span>
                </div>
                <Slider
                  min={0}
                  max={20}
                  step={1}
                  value={[settings.repelForce]}
                  onValueChange={(v) => handlePhysicsChange('repelForce', v[0])}
                  onValueCommit={() => flushPhysicsSetting('repelForce')}
                />
              </div>
              {/* Center Force */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs" title="Pulls nodes toward the graph's origin point. Higher values keep the graph compact and centered; 0 disables the force.">Center Force</Label>
                  <span className="text-xs text-muted-foreground font-mono">{settings.centerForce.toFixed(2)}</span>
                </div>
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={[settings.centerForce]}
                  onValueChange={(v) => handlePhysicsChange('centerForce', v[0])}
                  onValueCommit={() => flushPhysicsSetting('centerForce')}
                />
              </div>
              {/* Link Distance */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs">Link Distance</Label>
                  <span className="text-xs text-muted-foreground font-mono">{settings.linkDistance}</span>
                </div>
                <Slider
                  min={30}
                  max={500}
                  step={10}
                  value={[settings.linkDistance]}
                  onValueChange={(v) => handlePhysicsChange('linkDistance', v[0])}
                  onValueCommit={() => flushPhysicsSetting('linkDistance')}
                />
              </div>
              {/* Link Force */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs">Link Force</Label>
                  <span className="text-xs text-muted-foreground font-mono">{settings.linkForce.toFixed(2)}</span>
                </div>
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={[settings.linkForce]}
                  onValueChange={(v) => handlePhysicsChange('linkForce', v[0])}
                  onValueCommit={() => flushPhysicsSetting('linkForce')}
                />
              </div>
            </div>
          )}

          {/* Groups section */}
          <SectionHeader title="Groups" open={groupsOpen} onToggle={() => setGroupsOpen(v => !v)} />
          {groupsOpen && (
            <div className="mb-2 space-y-2">
              {groups.length === 0 ? (
                <p className="text-xs text-muted-foreground py-1">No groups. All nodes use the default grey color.</p>
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
                      className={cn(
                        'flex items-center gap-2 rounded transition-colors',
                        dragOverIndex === index && dragIndex !== index && 'bg-accent outline outline-1 outline-primary/50',
                        dragIndex === index && 'opacity-40'
                      )}
                    >
                      <svg className="w-3 h-3 text-muted-foreground flex-shrink-0 cursor-grab active:cursor-grabbing" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm8 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm8 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 22a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm8 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
                      </svg>
                      <span
                        className="w-4 h-4 rounded-sm flex-shrink-0 border"
                        style={{ backgroundColor: group.color }}
                      />
                      <span className="text-xs flex-1 truncate font-mono">{group.pattern}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-muted-foreground hover:text-destructive flex-shrink-0"
                        onClick={() => handleDeleteGroup(group.id)}
                        title="Delete group"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              {/* Add group form */}
              <div className="flex items-center gap-1.5 pt-1">
                <Input
                  value={newPattern}
                  onChange={e => setNewPattern(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddGroup()}
                  placeholder="src/**"
                  className="flex-1 h-7 text-xs min-w-0"
                />
                <input
                  type="color"
                  value={newColor}
                  onChange={e => setNewColor(e.target.value)}
                  className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0"
                  title="Pick color"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={handleAddGroup}
                  disabled={!newPattern.trim()}
                >
                  Add
                </Button>
              </div>
            </div>
          )}

          {/* Filters section */}
          <SectionHeader title="Filters" open={filtersOpen} onToggle={() => setFiltersOpen(v => !v)} />
          {filtersOpen && (
            <div className="mb-2 space-y-2">
              {/* Show Orphans toggle */}
              <div className="flex items-center justify-between py-0.5">
                <Label htmlFor="show-orphans" className="text-xs">Show Orphans</Label>
                <Switch
                  id="show-orphans"
                  checked={showOrphans}
                  onCheckedChange={handleShowOrphansToggle}
                />
              </div>

              {/* Max Files */}
              <div className="flex items-center justify-between py-0.5">
                <Label className="text-xs">Max Files</Label>
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleMaxFilesCommit(Math.max(1, maxFiles - 100))}
                    disabled={maxFiles <= 1}
                    title="Decrease by 100"
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </Button>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={maxFiles}
                    onChange={e => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v)) setMaxFiles(v);
                    }}
                    onBlur={e => handleMaxFilesCommit(parseInt(e.target.value, 10) || 1)}
                    onKeyDown={e => e.key === 'Enter' && handleMaxFilesCommit(parseInt((e.target as HTMLInputElement).value, 10) || 1)}
                    className="h-6 w-14 text-xs text-center px-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleMaxFilesCommit(maxFiles + 100)}
                    title="Increase by 100"
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </Button>
                </div>
              </div>

              {/* Plugin default filter patterns (read-only) */}
              {pluginFilterPatterns.length > 0 && (
                <>
                  <p className="text-xs text-muted-foreground">Plugin defaults (read-only)</p>
                  <ul className="space-y-1">
                    {pluginFilterPatterns.map(pattern => (
                      <li key={pattern} className="flex items-center gap-2 opacity-60">
                        <svg className="w-3 h-3 text-muted-foreground flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span className="text-xs text-muted-foreground flex-1 truncate font-mono">{pattern}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {/* User blacklist patterns */}
              <p className="text-xs text-muted-foreground">Custom (exclude from graph)</p>
              {filterPatterns.length === 0 ? (
                <p className="text-xs text-muted-foreground">No patterns.</p>
              ) : (
                <ul className="space-y-1">
                  {filterPatterns.map(pattern => (
                    <li key={pattern} className="flex items-center gap-2">
                      <span className="text-xs flex-1 truncate font-mono">{pattern}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-muted-foreground hover:text-destructive flex-shrink-0"
                        onClick={() => handleDeleteFilterPattern(pattern)}
                        title="Delete pattern"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex items-center gap-1.5 pt-1">
                <Input
                  value={newFilterPattern}
                  onChange={e => setNewFilterPattern(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddFilterPattern()}
                  placeholder="*.png"
                  className="flex-1 h-7 text-xs min-w-0"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={handleAddFilterPattern}
                  disabled={!newFilterPattern.trim()}
                >
                  Add
                </Button>
              </div>
            </div>
          )}

          {/* Display section */}
          <SectionHeader title="Display" open={displayOpen} onToggle={() => setDisplayOpen(v => !v)} />
          {displayOpen && (
            <div className="mb-2 space-y-3">
              {/* Arrows toggle */}
              <div className="flex items-center justify-between">
                <Label htmlFor="show-arrows" className="text-xs">Show Arrows</Label>
                <Switch
                  id="show-arrows"
                  checked={directionMode === 'arrows'}
                  onCheckedChange={handleShowArrowsChange}
                />
              </div>

              {/* Labels toggle */}
              <div className="flex items-center justify-between">
                <Label htmlFor="show-labels" className="text-xs">Show Labels</Label>
                <Switch
                  id="show-labels"
                  checked={showLabels}
                  onCheckedChange={handleShowLabelsChange}
                />
              </div>

              {/* Graph Mode */}
              <div className="flex items-center justify-between py-0.5">
                <Label className="text-xs">Graph Mode</Label>
                <div className="flex gap-1">
                  <Button
                    variant={graphMode === '2d' ? 'default' : 'secondary'}
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setGraphMode('2d')}
                  >
                    2D
                  </Button>
                  <Button
                    variant={graphMode === '3d' ? 'default' : 'secondary'}
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setGraphMode('3d')}
                  >
                    3D
                  </Button>
                </div>
              </div>

              {/* Node Size */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Node Size</Label>
                <div className="space-y-1">
                  {NODE_SIZE_OPTIONS.map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="nodeSizeMode"
                        value={opt.value}
                        checked={nodeSizeMode === opt.value}
                        onChange={() => setNodeSizeMode(opt.value)}
                        className="accent-primary"
                      />
                      <span className="text-xs">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* View */}
              {availableViews.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">View</Label>
                  <div className="space-y-1">
                    {availableViews.map(view => (
                      <label key={view.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="activeView"
                          value={view.id}
                          checked={activeViewId === view.id}
                          onChange={() => handleViewChange(view.id)}
                          className="accent-primary"
                        />
                        <span className="text-xs">{view.name}</span>
                      </label>
                    ))}
                  </div>
                  {/* Inline depth slider when Depth Graph is selected */}
                  {activeViewId === 'codegraphy.depth-graph' && (
                    <div className="flex items-center gap-2 mt-2 pl-4">
                      <Label className="text-xs text-muted-foreground">Depth:</Label>
                      <Slider
                        min={1}
                        max={5}
                        step={1}
                        value={[depthLimit]}
                        onValueChange={handleDepthChange}
                        className="w-20"
                      />
                      <span className="text-xs text-muted-foreground min-w-[1rem] text-center">{depthLimit}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
