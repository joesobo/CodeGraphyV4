/**
 * @fileoverview Settings panel with four collapsible accordion sections:
 * Forces, Groups, Filters, and Display.
 * @module webview/components/settingsPanel/Panel
 */

import React, { useState } from 'react';
import { mdiClose, mdiRefresh } from '@mdi/js';
import { postMessage } from '../../lib/vscodeApi';
import { MdiIcon } from '../icons';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { DisplaySection } from './display/Section';
import { FilterSection } from './filters/Section';
import { ForcesSection } from './forces/Section';
import { GroupsSection } from './groups/Section';
import { SectionHeader } from './SectionHeader';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps): React.ReactElement | null {
  const [forcesOpen, setForcesOpen] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [displayOpen, setDisplayOpen] = useState(false);

  if (!isOpen) {
    return null;
  }

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
          {forcesOpen && <ForcesSection />}

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
