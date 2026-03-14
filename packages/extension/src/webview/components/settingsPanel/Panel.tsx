/**
 * @fileoverview Settings panel with four collapsible accordion sections:
 * Forces, Groups, Filters, and Display.
 * @module webview/components/settingsPanel/Panel
 */

import React, { useEffect, useRef, useState } from 'react';
import { mdiChevronRight, mdiClose, mdiRefresh } from '@mdi/js';
import { type IPhysicsSettings } from '../../../shared/types';
import { cn } from '../../lib/utils';
import { postMessage } from '../../lib/vscodeApi';
import { useGraphStore } from '../../store';
import { MdiIcon } from '../icons';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Slider } from '../ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { DisplaySection } from './display/Section';
import { FilterSection } from './filters/Section';
import { GroupsSection } from './groups/Section';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const PHYSICS_PERSIST_DEBOUNCE_MS = 350;

function clearTimerRefs(
  ref: React.MutableRefObject<Partial<Record<string, ReturnType<typeof setTimeout>>>>
): void {
  for (const timer of Object.values(ref.current)) {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

function ChevronIcon({ open }: { open: boolean }): React.ReactElement {
  return (
    <MdiIcon
      path={mdiChevronRight}
      size={14}
      className={cn('text-muted-foreground transition-transform', open && 'rotate-90')}
    />
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

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps): React.ReactElement | null {
  const settings = useGraphStore((state) => state.physicsSettings);
  const setPhysicsSettings = useGraphStore((state) => state.setPhysicsSettings);

  const [forcesOpen, setForcesOpen] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [displayOpen, setDisplayOpen] = useState(false);

  const pendingPhysicsValuesRef = useRef<Partial<Record<keyof IPhysicsSettings, number>>>({});
  const physicsPersistTimersRef = useRef<
    Partial<Record<keyof IPhysicsSettings, ReturnType<typeof setTimeout>>>
  >({});

  useEffect(() => {
    return () => {
      clearTimerRefs(physicsPersistTimersRef);
    };
  }, []);

  if (!isOpen) {
    return null;
  }

  const flushPhysicsSetting = (key: keyof IPhysicsSettings) => {
    const pendingValue = pendingPhysicsValuesRef.current[key];
    if (pendingValue === undefined) {
      return;
    }

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
    setPhysicsSettings({ ...settings, [key]: value });
    schedulePhysicsSettingPersist(key, value);
  };

  return (
    <div className="bg-popover/95 backdrop-blur-sm rounded-lg border w-72 shadow-lg max-h-full flex flex-col overflow-hidden">
      <TooltipProvider delayDuration={300}>
        <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0">
          <span className="text-sm font-medium">Settings</span>
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => postMessage({ type: 'RESET_ALL_SETTINGS' })}
                  title="Reset Settings"
                >
                  <MdiIcon path={mdiRefresh} size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Reset all settings to defaults</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose} title="Close">
                  <MdiIcon path={mdiClose} size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Close</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TooltipProvider>

      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 pb-3">
          <SectionHeader title="Forces" open={forcesOpen} onToggle={() => setForcesOpen((open) => !open)} />
          {forcesOpen && (
            <div className="mb-2 space-y-3 pt-1">
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
                  onValueChange={(values) => handlePhysicsChange('repelForce', values[0])}
                  onValueCommit={() => flushPhysicsSetting('repelForce')}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label
                    className="text-xs"
                    title="Pulls nodes toward the graph's origin point. Higher values keep the graph compact and centered; 0 disables the force."
                  >
                    Center Force
                  </Label>
                  <span className="text-xs text-muted-foreground font-mono">
                    {settings.centerForce.toFixed(2)}
                  </span>
                </div>
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={[settings.centerForce]}
                  onValueChange={(values) => handlePhysicsChange('centerForce', values[0])}
                  onValueCommit={() => flushPhysicsSetting('centerForce')}
                />
              </div>
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
                  onValueChange={(values) => handlePhysicsChange('linkDistance', values[0])}
                  onValueCommit={() => flushPhysicsSetting('linkDistance')}
                />
              </div>
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
                  onValueChange={(values) => handlePhysicsChange('linkForce', values[0])}
                  onValueCommit={() => flushPhysicsSetting('linkForce')}
                />
              </div>
            </div>
          )}

          <SectionHeader title="Groups" open={groupsOpen} onToggle={() => setGroupsOpen((open) => !open)} />
          {groupsOpen && <GroupsSection />}

          <SectionHeader title="Filters" open={filtersOpen} onToggle={() => setFiltersOpen((open) => !open)} />
          {filtersOpen && <FilterSection />}

          <SectionHeader title="Display" open={displayOpen} onToggle={() => setDisplayOpen((open) => !open)} />
          {displayOpen && <DisplaySection />}
        </div>
      </ScrollArea>
    </div>
  );
}
