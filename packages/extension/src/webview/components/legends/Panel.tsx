import React from 'react';
import { mdiClose } from '@mdi/js';
import { MdiIcon } from '../icons/MdiIcon';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { GroupsSection } from '../settingsPanel/groups/Section';

interface LegendsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LegendsPanel({
  isOpen,
  onClose,
}: LegendsPanelProps): React.ReactElement | null {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="bg-popover/95 backdrop-blur-sm rounded-lg border w-72 shadow-lg max-h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0">
        <span className="text-sm font-medium">Legends</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose} title="Close">
          <MdiIcon path={mdiClose} size={16} />
        </Button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 pb-3 pt-2">
          <GroupsSection />
        </div>
      </ScrollArea>
    </div>
  );
}
