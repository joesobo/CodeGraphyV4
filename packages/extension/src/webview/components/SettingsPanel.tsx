/**
 * @fileoverview Settings panel with four collapsible accordion sections:
 * Forces, Groups, Filters, and Display.
 * @module webview/components/SettingsPanel
 */

import React, { useState, useRef, useEffect } from 'react';
import { IPhysicsSettings, NodeSizeMode, DirectionMode, IGroup, NodeShape2D, NodeShape3D } from '../../shared/types';
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

const SHAPE_2D_OPTIONS: { value: NodeShape2D; label: string }[] = [
  { value: 'circle', label: 'Circle' },
  { value: 'square', label: 'Square' },
  { value: 'diamond', label: 'Diamond' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'hexagon', label: 'Hexagon' },
  { value: 'star', label: 'Star' },
];

const SHAPE_3D_OPTIONS: { value: NodeShape3D; label: string }[] = [
  { value: 'sphere', label: 'Sphere' },
  { value: 'cube', label: 'Cube' },
  { value: 'octahedron', label: 'Octahedron' },
  { value: 'cone', label: 'Cone' },
  { value: 'dodecahedron', label: 'Dodecahedron' },
  { value: 'icosahedron', label: 'Icosahedron' },
];

const NODE_SIZE_OPTIONS: { value: NodeSizeMode; label: string }[] = [
  { value: 'connections', label: 'Connections' },
  { value: 'file-size', label: 'File Size' },
  { value: 'access-count', label: 'Access Count' },
  { value: 'uniform', label: 'Uniform' },
];

/** Delay before persisting slider updates to VS Code settings. */
const PHYSICS_PERSIST_DEBOUNCE_MS = 350;
const DEFAULT_DIRECTION_COLOR = '#475569';
const PARTICLE_SPEED_MIN_INTERNAL = 0.0005;
const PARTICLE_SPEED_MAX_INTERNAL = 0.005;
const PARTICLE_SPEED_MIN_DISPLAY = 1;
const PARTICLE_SPEED_MAX_DISPLAY = 10;

function isHexColor(value: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(value);
}

function particleSpeedToDisplay(speed: number): number {
  const clamped = Math.min(PARTICLE_SPEED_MAX_INTERNAL, Math.max(PARTICLE_SPEED_MIN_INTERNAL, speed));
  const ratio = (clamped - PARTICLE_SPEED_MIN_INTERNAL) / (PARTICLE_SPEED_MAX_INTERNAL - PARTICLE_SPEED_MIN_INTERNAL);
  return PARTICLE_SPEED_MIN_DISPLAY + ratio * (PARTICLE_SPEED_MAX_DISPLAY - PARTICLE_SPEED_MIN_DISPLAY);
}

function particleSpeedFromDisplay(level: number): number {
  const clamped = Math.min(PARTICLE_SPEED_MAX_DISPLAY, Math.max(PARTICLE_SPEED_MIN_DISPLAY, level));
  const ratio = (clamped - PARTICLE_SPEED_MIN_DISPLAY) / (PARTICLE_SPEED_MAX_DISPLAY - PARTICLE_SPEED_MIN_DISPLAY);
  return Number((PARTICLE_SPEED_MIN_INTERNAL + ratio * (PARTICLE_SPEED_MAX_INTERNAL - PARTICLE_SPEED_MIN_INTERNAL)).toFixed(6));
}

/** Delay before persisting color picker changes to avoid rapid updates while dragging. */
const COLOR_DEBOUNCE_MS = 300;

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
  const expandedGroupId = useGraphStore(s => s.expandedGroupId);
  const setExpandedGroupId = useGraphStore(s => s.setExpandedGroupId);
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
  const directionColor = useGraphStore(s => s.directionColor);
  const setDirectionMode = useGraphStore(s => s.setDirectionMode);
  const setDirectionColor = useGraphStore(s => s.setDirectionColor);
  const showLabels = useGraphStore(s => s.showLabels);
  const setShowLabels = useGraphStore(s => s.setShowLabels);
  const graphMode = useGraphStore(s => s.graphMode);
  const setGraphMode = useGraphStore(s => s.setGraphMode);
  const maxFiles = useGraphStore(s => s.maxFiles);
  const setMaxFiles = useGraphStore(s => s.setMaxFiles);

  // Local UI state
  const [forcesOpen, setForcesOpen] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [displayOpen, setDisplayOpen] = useState(false);

  // Groups form state
  const [newPattern, setNewPattern] = useState('');
  const [newColor, setNewColor] = useState('#3B82F6');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [expandedPluginIds, setExpandedPluginIds] = useState<Set<string>>(new Set());
  const [customExpanded, setCustomExpanded] = useState(true);

  // Color debounce: immediate visual feedback while dragging, debounced persistence
  const [localColorOverrides, setLocalColorOverrides] = useState<Record<string, string>>({});
  const colorDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Pattern debounce: immediate visual feedback while typing, debounced persistence
  const [localPatternOverrides, setLocalPatternOverrides] = useState<Record<string, string>>({});
  const patternDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Filters form state
  const [newFilterPattern, setNewFilterPattern] = useState('');

  const pendingPhysicsValuesRef = useRef<Partial<Record<keyof IPhysicsSettings, number>>>({});
  const physicsPersistTimersRef = useRef<Partial<Record<keyof IPhysicsSettings, ReturnType<typeof setTimeout>>>>({});

  // Particle settings refs and store reads (must be before early return for hooks rules)
  const pendingParticleValuesRef = useRef<Partial<Record<'particleSpeed' | 'particleSize', number>>>({});
  const particlePersistTimersRef = useRef<Partial<Record<'particleSpeed' | 'particleSize', ReturnType<typeof setTimeout>>>>({});
  const particleSpeed = useGraphStore(s => s.particleSpeed);
  const setParticleSpeed = useGraphStore(s => s.setParticleSpeed);
  const particleSize = useGraphStore(s => s.particleSize);
  const setParticleSize = useGraphStore(s => s.setParticleSize);

  useEffect(() => {
    const timersRef = physicsPersistTimersRef;
    const particleTimersRef = particlePersistTimersRef;
    const colorTimersRef = colorDebounceRef;
    const patternTimersRef = patternDebounceRef;
    return () => {
      for (const timer of Object.values(timersRef.current)) {
        if (timer) clearTimeout(timer);
      }
      for (const timer of Object.values(particleTimersRef.current)) {
        if (timer) clearTimeout(timer);
      }
      for (const timer of Object.values(colorTimersRef.current)) {
        if (timer) clearTimeout(timer);
      }
      for (const timer of Object.values(patternTimersRef.current)) {
        if (timer) clearTimeout(timer);
      }
    };
  }, []);

  if (!isOpen) return null;

  // Split groups into user-defined and defaults (built-in + plugin)
  const userGroups = groups.filter(g => !g.isPluginDefault);
  const defaultGroups = groups.filter(g => g.isPluginDefault);

  // Group defaults by section: "default" for built-in, plugin ID for plugin groups
  const defaultSections = defaultGroups.reduce<Record<string, { sectionId: string; sectionName: string; groups: IGroup[] }>>((acc, g) => {
    let sectionId: string;
    let sectionName: string;
    if (g.id.startsWith('default:')) {
      sectionId = 'default';
      sectionName = g.pluginName ?? 'CodeGraphy';
    } else {
      const match = g.id.match(/^plugin:([^:]+):/);
      sectionId = match?.[1] ?? 'unknown';
      sectionName = g.pluginName ?? sectionId;
    }
    if (!acc[sectionId]) acc[sectionId] = { sectionId, sectionName, groups: [] };
    acc[sectionId].groups.push(g);
    return acc;
  }, {});

  // Groups handlers — only send user groups in UPDATE_GROUPS
  const sendUserGroups = (updated: IGroup[]) => {
    postMessage({ type: 'UPDATE_GROUPS', payload: { groups: updated } });
  };

  const handleAddGroup = () => {
    if (!newPattern.trim()) return;
    const newId = crypto.randomUUID();
    const updatedUser = [...userGroups, { id: newId, pattern: newPattern.trim(), color: newColor }];
    sendUserGroups(updatedUser);
    setNewPattern('');
    setNewColor('#3B82F6');
    setExpandedGroupId(newId);
  };

  const handleUpdateGroup = (id: string, updates: Partial<IGroup>) => {
    const updatedUser = userGroups.map(g => g.id === id ? { ...g, ...updates } : g);
    sendUserGroups(updatedUser);
  };

  /** Override a plugin default: create a user copy with changes (original stays visible). */
  const handleOverridePluginGroup = (group: IGroup, updates: Partial<IGroup>) => {
    const newId = crypto.randomUUID();
    // Encode plugin source into imagePath so the extension can resolve it
    // from the correct plugin root (e.g. "assets/godot.svg" → "plugin:godot:assets/godot.svg")
    let inheritedImagePath = group.imagePath;
    if (inheritedImagePath && !inheritedImagePath.startsWith('plugin:')) {
      const pluginIdMatch = group.id.match(/^plugin:([^:]+):/);
      if (pluginIdMatch) {
        inheritedImagePath = `plugin:${pluginIdMatch[1]}:${inheritedImagePath}`;
      }
    }
    const override: IGroup = {
      id: newId,
      pattern: group.pattern,
      color: group.color,
      shape2D: group.shape2D,
      shape3D: group.shape3D,
      imagePath: inheritedImagePath,
      ...updates,
    };
    const updatedUser = [...userGroups, override];
    sendUserGroups(updatedUser);
    setExpandedGroupId(newId);
  };

  /** Debounced color update for user groups — immediate visual, delayed persistence. */
  const handleDebouncedColorUpdate = (groupId: string, color: string) => {
    setLocalColorOverrides(prev => ({ ...prev, [groupId]: color }));
    if (colorDebounceRef.current[groupId]) clearTimeout(colorDebounceRef.current[groupId]);
    colorDebounceRef.current[groupId] = setTimeout(() => {
      handleUpdateGroup(groupId, { color });
      setLocalColorOverrides(prev => {
        const next = { ...prev };
        delete next[groupId];
        return next;
      });
      delete colorDebounceRef.current[groupId];
    }, COLOR_DEBOUNCE_MS);
  };

  /** Debounced color override for plugin groups — immediate visual, delayed override creation. */
  const handleDebouncedPluginColorOverride = (group: IGroup, color: string) => {
    setLocalColorOverrides(prev => ({ ...prev, [group.id]: color }));
    if (colorDebounceRef.current[group.id]) clearTimeout(colorDebounceRef.current[group.id]);
    colorDebounceRef.current[group.id] = setTimeout(() => {
      handleOverridePluginGroup(group, { color });
      setLocalColorOverrides(prev => {
        const next = { ...prev };
        delete next[group.id];
        return next;
      });
      delete colorDebounceRef.current[group.id];
    }, COLOR_DEBOUNCE_MS);
  };

  /** Debounced pattern update — immediate visual, delayed persistence. */
  const handleDebouncedPatternUpdate = (groupId: string, pattern: string) => {
    setLocalPatternOverrides(prev => ({ ...prev, [groupId]: pattern }));
    if (patternDebounceRef.current[groupId]) clearTimeout(patternDebounceRef.current[groupId]);
    patternDebounceRef.current[groupId] = setTimeout(() => {
      handleUpdateGroup(groupId, { pattern });
      setLocalPatternOverrides(prev => {
        const next = { ...prev };
        delete next[groupId];
        return next;
      });
      delete patternDebounceRef.current[groupId];
    }, COLOR_DEBOUNCE_MS);
  };

  const handlePickImage = (groupId: string) => {
    postMessage({ type: 'PICK_GROUP_IMAGE', payload: { groupId } });
  };

  const handleClearImage = (groupId: string) => {
    handleUpdateGroup(groupId, { imagePath: undefined, imageUrl: undefined });
  };

  const handleDeleteGroup = (id: string) => {
    const updatedUser = userGroups.filter(g => g.id !== id);
    sendUserGroups(updatedUser);
  };

  const handleTogglePluginGroupDisabled = (groupId: string, disabled: boolean) => {
    postMessage({ type: 'TOGGLE_PLUGIN_GROUP_DISABLED', payload: { groupId, disabled } });
  };

  const handleTogglePluginSectionDisabled = (pluginId: string, disabled: boolean) => {
    postMessage({ type: 'TOGGLE_PLUGIN_SECTION_DISABLED', payload: { pluginId, disabled } });
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
    const updated = [...userGroups];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(targetIndex, 0, moved);
    sendUserGroups(updated);
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

  // Particle settings debounce (same pattern as physics sliders)
  const flushParticleSetting = (key: 'particleSpeed' | 'particleSize') => {
    const pendingValue = pendingParticleValuesRef.current[key];
    if (pendingValue === undefined) return;

    const timer = particlePersistTimersRef.current[key];
    if (timer) {
      clearTimeout(timer);
      delete particlePersistTimersRef.current[key];
    }

    delete pendingParticleValuesRef.current[key];
    postMessage({ type: 'UPDATE_PARTICLE_SETTING', payload: { key, value: pendingValue } });
  };

  const scheduleParticleSettingPersist = (key: 'particleSpeed' | 'particleSize', value: number) => {
    pendingParticleValuesRef.current[key] = value;

    const existingTimer = particlePersistTimersRef.current[key];
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    particlePersistTimersRef.current[key] = setTimeout(() => {
      flushParticleSetting(key);
    }, PHYSICS_PERSIST_DEBOUNCE_MS);
  };

  // Display handlers
  const handleDirectionModeChange = (mode: DirectionMode) => {
    setDirectionMode(mode);
    postMessage({ type: 'UPDATE_DIRECTION_MODE', payload: { directionMode: mode } });
  };

  const resolvedDirectionColor = isHexColor(directionColor) ? directionColor : DEFAULT_DIRECTION_COLOR;
  const displayParticleSpeed = particleSpeedToDisplay(particleSpeed);

  const handleDirectionColorChange = (value: string) => {
    const normalized = value.toUpperCase();
    setDirectionColor(normalized);
    postMessage({ type: 'UPDATE_DIRECTION_COLOR', payload: { directionColor: normalized } });
  };

  const handleParticleSpeedChange = (level: number) => {
    const normalized = particleSpeedFromDisplay(level);
    setParticleSpeed(normalized);
    scheduleParticleSettingPersist('particleSpeed', normalized);
  };

  const handleParticleSizeChange = (value: number) => {
    setParticleSize(value);
    scheduleParticleSettingPersist('particleSize', value);
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
              {/* Custom groups (user-defined) — collapsible, placed first for priority */}
              <div>
                <button
                  onClick={() => setCustomExpanded(v => !v)}
                  className="flex items-center gap-1.5 w-full py-0.5 text-left hover:bg-accent rounded transition-colors px-1"
                >
                  <ChevronIcon open={customExpanded} />
                  <span className="text-[11px] font-medium">Custom</span>
                  <span className="text-[10px] text-muted-foreground">({userGroups.length})</span>
                </button>
                {customExpanded && (
                  <div className="ml-2 mt-1 space-y-1">
                    {userGroups.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground py-1">No custom groups.</p>
                    ) : (
                      <ul className="space-y-1">
                        {userGroups.map((group, index) => {
                          const isExpanded = expandedGroupId === group.id;
                          const displayColor = localColorOverrides[group.id] ?? group.color;
                          return (
                            <li
                              key={group.id}
                              draggable={!isExpanded}
                              onDragStart={() => handleGroupDragStart(index)}
                              onDragOver={(e) => handleGroupDragOver(e, index)}
                              onDrop={(e) => handleGroupDrop(e, index)}
                              onDragEnd={handleGroupDragEnd}
                              className={cn(
                                'rounded transition-colors',
                                dragOverIndex === index && dragIndex !== index && 'bg-accent outline outline-1 outline-primary/50',
                                dragIndex === index && 'opacity-40',
                                isExpanded && 'bg-accent/50 p-1.5',
                                group.disabled && 'opacity-50'
                              )}
                            >
                              {/* Collapsed row */}
                              <div
                                className="flex items-center gap-2 cursor-pointer"
                                onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                              >
                                <svg className="w-3 h-3 text-muted-foreground flex-shrink-0 cursor-grab active:cursor-grabbing" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm8 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm8 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 22a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm8 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
                                </svg>
                                <span
                                  className="w-4 h-4 rounded-sm flex-shrink-0 border"
                                  style={{ backgroundColor: displayColor }}
                                />
                                <span className="text-xs flex-1 truncate font-mono">{group.pattern}</span>
                                {group.shape2D && group.shape2D !== 'circle' && (
                                  <span className="text-[10px] text-muted-foreground">{group.shape2D}</span>
                                )}
                                {group.imageUrl && (
                                  <img src={group.imageUrl} alt="" className="w-4 h-4 object-cover rounded-sm flex-shrink-0" />
                                )}
                                {/* Eye toggle */}
                                <button
                                  className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                                  onClick={(e) => { e.stopPropagation(); handleUpdateGroup(group.id, { disabled: !group.disabled }); }}
                                  title={group.disabled ? 'Enable group' : 'Disable group'}
                                >
                                  {group.disabled ? (
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18" />
                                    </svg>
                                  ) : (
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                  )}
                                </button>
                                <ChevronIcon open={isExpanded} />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 text-muted-foreground hover:text-destructive flex-shrink-0"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}
                                  title="Delete group"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </Button>
                              </div>

                              {/* Expanded editor */}
                              {isExpanded && (
                                <div className="mt-2 space-y-2 pl-5">
                                  {/* Pattern */}
                                  <div>
                                    <Label className="text-[10px] text-muted-foreground">Pattern</Label>
                                    <Input
                                      value={localPatternOverrides[group.id] ?? group.pattern}
                                      onChange={e => handleDebouncedPatternUpdate(group.id, e.target.value)}
                                      className="h-6 text-xs"
                                    />
                                  </div>
                                  {/* Color */}
                                  <div className="flex items-center gap-2">
                                    <Label className="text-[10px] text-muted-foreground">Color</Label>
                                    <input
                                      type="color"
                                      value={displayColor}
                                      onChange={e => handleDebouncedColorUpdate(group.id, e.target.value)}
                                      className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                                    />
                                  </div>
                                  {/* 2D Shape */}
                                  <div>
                                    <Label className="text-[10px] text-muted-foreground">2D Shape</Label>
                                    <select
                                      value={group.shape2D ?? 'circle'}
                                      onChange={e => handleUpdateGroup(group.id, { shape2D: e.target.value as NodeShape2D })}
                                      className="w-full h-6 text-xs bg-background border rounded px-1"
                                    >
                                      {SHAPE_2D_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                      ))}
                                    </select>
                                  </div>
                                  {/* 3D Shape */}
                                  <div>
                                    <Label className="text-[10px] text-muted-foreground">3D Shape</Label>
                                    <select
                                      value={group.shape3D ?? 'sphere'}
                                      onChange={e => handleUpdateGroup(group.id, { shape3D: e.target.value as NodeShape3D })}
                                      className="w-full h-6 text-xs bg-background border rounded px-1"
                                    >
                                      {SHAPE_3D_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                      ))}
                                    </select>
                                  </div>
                                  {/* Image */}
                                  <div>
                                    <Label className="text-[10px] text-muted-foreground">Image</Label>
                                    <div className="flex items-center gap-1.5">
                                      {group.imageUrl ? (
                                        <>
                                          <img src={group.imageUrl} alt="" className="w-8 h-8 object-cover rounded border" />
                                          <Button
                                            variant="secondary"
                                            size="sm"
                                            className="h-6 px-2 text-[10px]"
                                            onClick={() => handleClearImage(group.id)}
                                          >
                                            Clear
                                          </Button>
                                        </>
                                      ) : (
                                        <Button
                                          variant="secondary"
                                          size="sm"
                                          className="h-6 px-2 text-[10px]"
                                          onClick={() => handlePickImage(group.id)}
                                        >
                                          Choose Image...
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </li>
                          );
                        })}
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
              </div>

              {/* Default groups — built-in (CodeGraphy) + per-plugin, collapsible */}
              {Object.values(defaultSections).map(({ sectionId, sectionName, groups: sgGroups }) => {
                const isPluginExpanded = expandedPluginIds.has(sectionId);
                const allDisabled = sgGroups.every(g => g.disabled);
                const togglePlugin = () => setExpandedPluginIds(prev => {
                  const next = new Set(prev);
                  if (next.has(sectionId)) next.delete(sectionId); else next.add(sectionId);
                  return next;
                });
                return (
                  <div key={sectionId} className={cn(allDisabled && 'opacity-50')}>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={togglePlugin}
                        className="flex items-center gap-1.5 flex-1 min-w-0 py-0.5 text-left hover:bg-accent rounded transition-colors px-1"
                      >
                        <ChevronIcon open={isPluginExpanded} />
                        <span className="text-[11px] font-medium truncate">{sectionName}</span>
                        <span className="text-[10px] text-muted-foreground">({sgGroups.length})</span>
                      </button>
                      {/* Section-level eye toggle */}
                      <button
                        className="flex-shrink-0 text-muted-foreground hover:text-foreground p-0.5"
                        onClick={() => handleTogglePluginSectionDisabled(sectionId, !allDisabled)}
                        title={allDisabled ? `Enable all ${sectionName} groups` : `Disable all ${sectionName} groups`}
                      >
                        {allDisabled ? (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {isPluginExpanded && (
                      <ul className="space-y-1 ml-2 mt-1">
                        {sgGroups.map(group => {
                          const isExpanded = expandedGroupId === group.id;
                          const displayColor = localColorOverrides[group.id] ?? group.color;
                          return (
                            <li key={group.id} className={cn('rounded transition-colors', isExpanded && 'bg-accent/50 p-1.5', group.disabled && 'opacity-50')}>
                              <div
                                className="flex items-center gap-2 cursor-pointer"
                                onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                              >
                                <span
                                  className="w-4 h-4 rounded-sm flex-shrink-0 border"
                                  style={{ backgroundColor: displayColor }}
                                />
                                <span className="text-xs flex-1 truncate font-mono">{group.pattern}</span>
                                {group.imageUrl && (
                                  <img src={group.imageUrl} alt="" className="w-4 h-4 object-cover rounded-sm flex-shrink-0" />
                                )}
                                {/* Eye toggle */}
                                <button
                                  className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                                  onClick={(e) => { e.stopPropagation(); handleTogglePluginGroupDisabled(group.id, !group.disabled); }}
                                  title={group.disabled ? 'Enable group' : 'Disable group'}
                                >
                                  {group.disabled ? (
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18" />
                                    </svg>
                                  ) : (
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                  )}
                                </button>
                                <ChevronIcon open={isExpanded} />
                              </div>
                              {/* Expanded editor — editing creates a user override */}
                              {isExpanded && (
                                <div className="mt-2 space-y-2 pl-4">
                                  <p className="text-[10px] text-muted-foreground italic">Editing will create a custom override</p>
                                  {/* Color */}
                                  <div className="flex items-center gap-2">
                                    <Label className="text-[10px] text-muted-foreground">Color</Label>
                                    <input
                                      type="color"
                                      value={displayColor}
                                      onChange={e => handleDebouncedPluginColorOverride(group, e.target.value)}
                                      className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                                    />
                                  </div>
                                  {/* 2D Shape */}
                                  <div>
                                    <Label className="text-[10px] text-muted-foreground">2D Shape</Label>
                                    <select
                                      value={group.shape2D ?? 'circle'}
                                      onChange={e => handleOverridePluginGroup(group, { shape2D: e.target.value as NodeShape2D })}
                                      className="w-full h-6 text-xs bg-background border rounded px-1"
                                    >
                                      {SHAPE_2D_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                      ))}
                                    </select>
                                  </div>
                                  {/* 3D Shape */}
                                  <div>
                                    <Label className="text-[10px] text-muted-foreground">3D Shape</Label>
                                    <select
                                      value={group.shape3D ?? 'sphere'}
                                      onChange={e => handleOverridePluginGroup(group, { shape3D: e.target.value as NodeShape3D })}
                                      className="w-full h-6 text-xs bg-background border rounded px-1"
                                    >
                                      {SHAPE_3D_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
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
              {/* Direction mode toggle */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Direction</Label>
                <div className="flex gap-1">
                  <Button
                    variant={directionMode === 'arrows' ? 'default' : 'secondary'}
                    size="sm"
                    className="h-6 px-2 text-xs flex-1"
                    onClick={() => handleDirectionModeChange('arrows')}
                  >
                    Arrows
                  </Button>
                  <Button
                    variant={directionMode === 'particles' ? 'default' : 'secondary'}
                    size="sm"
                    className="h-6 px-2 text-xs flex-1"
                    onClick={() => handleDirectionModeChange('particles')}
                  >
                    Particles
                  </Button>
                  <Button
                    variant={directionMode === 'none' ? 'default' : 'secondary'}
                    size="sm"
                    className="h-6 px-2 text-xs flex-1"
                    onClick={() => handleDirectionModeChange('none')}
                  >
                    None
                  </Button>
                </div>
              </div>

              {/* Direction color */}
              <div>
                <Label htmlFor="direction-color" className="text-xs text-muted-foreground mb-1.5 block">Direction Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="direction-color"
                    type="color"
                    value={resolvedDirectionColor}
                    onChange={(e) => handleDirectionColorChange(e.target.value)}
                    className="h-7 w-10 p-1"
                  />
                  <span className="text-[11px] text-muted-foreground font-mono flex-1">
                    {resolvedDirectionColor}
                  </span>
                </div>
              </div>

              {/* Particle settings (visible only when mode is 'particles') */}
              {directionMode === 'particles' && (
                <div className="space-y-3 pl-2 border-l border-border">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs">Particle Speed</Label>
                      <span className="text-xs text-muted-foreground font-mono">{Math.round(displayParticleSpeed)}</span>
                    </div>
                    <Slider
                      min={PARTICLE_SPEED_MIN_DISPLAY}
                      max={PARTICLE_SPEED_MAX_DISPLAY}
                      step={1}
                      value={[displayParticleSpeed]}
                      onValueChange={(v) => handleParticleSpeedChange(v[0])}
                      onValueCommit={() => flushParticleSetting('particleSpeed')}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs">Particle Size</Label>
                      <span className="text-xs text-muted-foreground font-mono">{particleSize.toFixed(1)}</span>
                    </div>
                    <Slider
                      min={1}
                      max={10}
                      step={0.5}
                      value={[particleSize]}
                      onValueChange={(v) => handleParticleSizeChange(v[0])}
                      onValueCommit={() => flushParticleSetting('particleSize')}
                    />
                  </div>
                </div>
              )}

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
