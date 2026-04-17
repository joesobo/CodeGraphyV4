import React from 'react';
import Toolbar from '../../../components/toolbar/view';

type ToolbarProps = React.ComponentProps<typeof Toolbar>;

export function ToolbarRail({ pluginHost }: { pluginHost: ToolbarProps['pluginHost'] }): React.ReactElement {
  return (
    <div className="absolute inset-y-2 left-2 z-10 pointer-events-none">
      <div className="h-full pointer-events-auto">
        <Toolbar pluginHost={pluginHost} />
      </div>
    </div>
  );
}
